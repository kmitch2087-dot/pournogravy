interface Tab {
  id: string;
  label: string;
}

interface AdminTabBarProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
}

export function AdminTabBar({ tabs, activeTab, onChange }: AdminTabBarProps) {
  return (
    <div className="border-b border-border mb-6">
      <div className="flex gap-0 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={[
              "px-4 py-2.5 text-sm font-display tracking-widest whitespace-nowrap transition-colors",
              activeTab === tab.id
                ? "border-b-2 border-[#fde047] text-[#fde047]"
                : "text-muted-foreground hover:text-foreground border-b-2 border-transparent",
            ].join(" ")}
          >
            {tab.label.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}
