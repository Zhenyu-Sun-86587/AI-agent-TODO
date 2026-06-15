import { Plus } from "lucide-react";
import type { MinimalNavItem } from "./types";
import NavItem from "./NavItem";

export default function MobileNav({
  activePage,
  mobileMoreItems,
  mobilePrimaryItems,
  mobileSecondaryItems,
  onCreateTask,
  onNavigate,
}: {
  activePage: string;
  mobileMoreItems: MinimalNavItem[];
  mobilePrimaryItems: MinimalNavItem[];
  mobileSecondaryItems: MinimalNavItem[];
  onCreateTask: () => void;
  onNavigate: (page: string) => void;
}) {
  return (
    <>
      <nav className="minimal-mobile-nav mobile-bottom-nav" aria-label="移动端导航">
        {mobilePrimaryItems.map((item) => (
          <NavItem
            active={item.key === activePage}
            icon={item.icon}
            key={item.key}
            label={item.label}
            onClick={() => onNavigate(item.key)}
          />
        ))}
        <button className="mobile-create-action" type="button" onClick={onCreateTask} aria-label="新建任务">
          <Plus size={20} />
          <span>新建</span>
        </button>
        {mobileSecondaryItems.map((item) => (
          <NavItem
            active={item.key === activePage}
            icon={item.icon}
            key={item.key}
            label={item.label}
            onClick={() => onNavigate(item.key)}
          />
        ))}
      </nav>
      <nav className="minimal-mobile-more-nav" aria-label="移动端更多页面">
        {mobileMoreItems.map((item) => {
          const Icon = item.icon;
          return (
            <button className={item.key === activePage ? "active" : ""} key={item.key} type="button" onClick={() => onNavigate(item.key)}>
              <Icon size={16} />
              {item.label}
            </button>
          );
        })}
      </nav>
    </>
  );
}
