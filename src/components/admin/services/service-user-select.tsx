import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { UserListItem } from "@/hooks/use-services";

interface ServiceUserSelectProps {
  id?: string;
  label?: string;
  currentUser?: { name?: string | null; email?: string | null } | null;
  users: UserListItem[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const ServiceUserSelect = ({
  id = "assign-user",
  label = "Assignee User *",
  currentUser,
  users,
  value,
  onChange,
  placeholder = "Select a user...",
}: ServiceUserSelectProps) => (
  <div className="grid gap-2">
    <Label htmlFor={id}>{label}</Label>
    {currentUser ? (
      <div className="text-sm font-semibold p-2 bg-muted rounded">
        {currentUser.name || currentUser.email}
      </div>
    ) : (
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {users.map((u) => (
            <SelectItem key={u.id} value={u.id}>
              {u.name ? `${u.name} (${u.email})` : u.email}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )}
  </div>
);
