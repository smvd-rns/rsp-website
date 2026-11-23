const http = require('http');
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5433,
  database: 'rsp_db',
  user: 'postgres',
  password: 'postgres',
});

const PORT = 4000;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/api/tables') {
    try {
      const q = `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'rsp' 
        ORDER BY table_name;
      `;
      const result = await pool.query(q);
      const counts = await Promise.all(
        result.rows.map(async r => {
          const c = await pool.query(`SELECT count(*) FROM rsp."${r.table_name}"`);
          return { name: r.table_name, count: c.rows[0].count };
        })
      );
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(counts));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  if (url.pathname === '/api/data') {
    const table = url.searchParams.get('table') || 'users';
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const search = url.searchParams.get('search') || '';
    const limit = 50;
    const offset = (page - 1) * limit;

    try {
      let whereClause = '';
      const params = [limit, offset];

      if (search) {
        // Simple search across text columns
        const colRes = await pool.query(
          `SELECT column_name FROM information_schema.columns WHERE table_schema = 'rsp' AND table_name = $1 AND data_type IN ('text', 'character varying');`,
          [table]
        );
        if (colRes.rows.length > 0) {
          const searchConds = colRes.rows.map(c => `"${c.column_name}"::text ILIKE $3`).join(' OR ');
          whereClause = `WHERE (${searchConds})`;
          params.push(`%${search}%`);
        }
      }

      const countSql = `SELECT count(*) FROM rsp."${table}" ${whereClause};`;
      const countRes = await pool.query(countSql, search ? [params[2]] : []);
      const total = parseInt(countRes.rows[0].count, 10);

      const dataSql = `SELECT * FROM rsp."${table}" ${whereClause} LIMIT $1 OFFSET $2;`;
      const dataRes = await pool.query(dataSql, params);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ rows: dataRes.rows, total, page, limit }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // Serve Single Page Application HTML
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Local Database Viewer - rsp_db</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    th, td { white-space: nowrap; max-width: 320px; overflow: hidden; text-overflow: ellipsis; }
  </style>
</head>
<body class="bg-gray-50 text-gray-900 flex h-screen overflow-hidden">
  <!-- Sidebar -->
  <aside class="w-64 bg-slate-900 text-white flex flex-col border-r border-slate-800">
    <div class="p-4 border-b border-slate-800">
      <div class="flex items-center gap-2">
        <span class="inline-block w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
        <h1 class="font-bold text-lg tracking-wide">rsp_db (Local)</h1>
      </div>
      <p class="text-xs text-slate-400 mt-1">PostgreSQL on localhost:5433</p>
    </div>
    <div class="p-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Tables (schema: rsp)</div>
    <nav id="tableList" class="flex-1 overflow-y-auto px-2 space-y-1"></nav>
    <div class="p-3 border-t border-slate-800 text-xs text-slate-500">
      100% Offline & Local
    </div>
  </aside>

  <!-- Main View -->
  <main class="flex-1 flex flex-col overflow-hidden">
    <!-- Header -->
    <header class="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <div>
        <h2 id="currentTableTitle" class="text-xl font-bold text-gray-800 capitalize">users</h2>
        <p id="recordStats" class="text-xs text-gray-500 mt-0.5">Loading records...</p>
      </div>
      <div class="flex items-center gap-3">
        <input 
          type="text" 
          id="searchInput" 
          placeholder="Search current table..." 
          class="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-64"
        />
        <button id="refreshBtn" class="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-md text-sm font-medium transition">
          Refresh
        </button>
      </div>
    </header>

    <!-- Table Container -->
    <div class="flex-1 overflow-auto p-6">
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead id="tableHead" class="bg-slate-100 text-slate-700 font-semibold border-b border-gray-200 sticky top-0"></thead>
            <tbody id="tableBody" class="divide-y divide-gray-100"></tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <footer class="bg-white border-t border-gray-200 px-6 py-3 flex items-center justify-between text-xs text-gray-600">
      <span id="pageInfo">Showing 1 to 50</span>
      <div class="flex items-center gap-2">
        <button id="prevBtn" class="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40">Previous</button>
        <button id="nextBtn" class="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40">Next</button>
      </div>
    </footer>
  </main>

  <script>
    let currentTable = 'users';
    let currentPage = 1;
    let totalRecords = 0;
    let limit = 50;

    async function loadTables() {
      const res = await fetch('/api/tables');
      const tables = await res.json();
      const list = document.getElementById('tableList');
      list.innerHTML = '';
      tables.forEach(t => {
        const btn = document.createElement('button');
        btn.className = 'w-full flex items-center justify-between px-3 py-2 rounded text-sm text-left transition ' + 
          (t.name === currentTable ? 'bg-emerald-600 text-white font-medium' : 'text-slate-300 hover:bg-slate-800');
        btn.innerHTML = '<span>' + t.name + '</span><span class="text-xs opacity-70 bg-black/20 px-2 py-0.5 rounded">' + t.count + '</span>';
        btn.onclick = () => {
          currentTable = t.name;
          currentPage = 1;
          document.getElementById('searchInput').value = '';
          loadTables();
          loadData();
        };
        list.appendChild(btn);
      });
    }

    async function loadData() {
      document.getElementById('currentTableTitle').textContent = currentTable;
      const search = document.getElementById('searchInput').value;
      const res = await fetch('/api/data?table=' + currentTable + '&page=' + currentPage + '&search=' + encodeURIComponent(search));
      const json = await res.json();

      totalRecords = json.total;
      document.getElementById('recordStats').textContent = 'Total: ' + totalRecords + ' records';

      const head = document.getElementById('tableHead');
      const body = document.getElementById('tableBody');
      head.innerHTML = '';
      body.innerHTML = '';

      if (!json.rows || json.rows.length === 0) {
        body.innerHTML = '<tr><td colspan="10" class="p-6 text-center text-gray-400">No records found.</td></tr>';
        document.getElementById('pageInfo').textContent = '0 records';
        return;
      }

      const cols = Object.keys(json.rows[0]);
      const trHead = document.createElement('tr');
      cols.forEach(c => {
        const th = document.createElement('th');
        th.className = 'px-4 py-2.5';
        th.textContent = c;
        trHead.appendChild(th);
      });
      head.appendChild(trHead);

      json.rows.forEach((r, idx) => {
        const tr = document.createElement('tr');
        tr.className = idx % 2 === 0 ? 'bg-white hover:bg-slate-50' : 'bg-slate-50/50 hover:bg-slate-100/50';
        cols.forEach(c => {
          const td = document.createElement('td');
          td.className = 'px-4 py-2 text-gray-700';
          const val = r[c];
          td.textContent = val !== null && val !== undefined ? String(val) : '';
          td.title = val !== null && val !== undefined ? String(val) : '';
          tr.appendChild(td);
        });
        body.appendChild(tr);
      });

      const start = (currentPage - 1) * limit + 1;
      const end = Math.min(currentPage * limit, totalRecords);
      document.getElementById('pageInfo').textContent = 'Showing ' + start + ' - ' + end + ' of ' + totalRecords;
      document.getElementById('prevBtn').disabled = currentPage <= 1;
      document.getElementById('nextBtn').disabled = end >= totalRecords;
    }

    document.getElementById('prevBtn').onclick = () => { if (currentPage > 1) { currentPage--; loadData(); } };
    document.getElementById('nextBtn').onclick = () => { currentPage++; loadData(); };
    document.getElementById('refreshBtn').onclick = () => loadData();
    let searchTimer;
    document.getElementById('searchInput').oninput = () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => { currentPage = 1; loadData(); }, 300);
    };

    loadTables();
    loadData();
  </script>
</body>
</html>`;

  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(html);
});

server.listen(PORT, () => {
  console.log(`Local Database Viewer running at: http://localhost:${PORT}`);
});

