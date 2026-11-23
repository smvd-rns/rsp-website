"use client";

import { TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TabNavigationProps {
  hasImageSrc: boolean;
}

export const TabNavigation = ({ hasImageSrc }: TabNavigationProps) => {
  const tabs = [
    { value: "browse", label: "Browse" },
    { value: "upload", label: "Upload New" },
    ...(hasImageSrc ? [{ value: "edit", label: "Edit & Crop" }] : []),
  ];

  return (
    <TabsList className="bg-transparent gap-8 h-10! p-0 border-b w-full justify-start rounded-none">
      {tabs.map((tab) => (
        <TabsTrigger
          key={tab.value}
          value={tab.value}
          className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 h-10! bg-transparent shadow-none font-medium transition-all"
        >
          {tab.label}
        </TabsTrigger>
      ))}
    </TabsList>
  );
};
