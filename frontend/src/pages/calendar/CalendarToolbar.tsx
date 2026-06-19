import type { CalendarView } from "../../app/types/common";
import PageHeading from "../PageHeading";
import { motionStyle } from "./calendarUtils";

interface CalendarToolbarProps {
  onJumpToToday: () => void;
  onMoveDay: (offset: number) => void;
  onMoveMonth: (offset: number) => void;
  onMoveWeek: (offset: number) => void;
  view: CalendarView;
}

export function CalendarToolbar({
  onJumpToToday,
  onMoveDay,
  onMoveMonth,
  onMoveWeek,
  view,
}: CalendarToolbarProps) {
  return (
    <div className="calendar-toolbar">
      <PageHeading title="日历视图" />
      <div className="calendar-month-actions" aria-label={view === "week" ? "周切换" : view === "24h" ? "日期切换" : "月份切换"}>
        <button style={motionStyle(0)} type="button" onClick={onJumpToToday}>今天</button>
        {view === "week" ? (
          <>
            <button style={motionStyle(1)} type="button" onClick={() => onMoveWeek(-1)}>上一周</button>
            <button style={motionStyle(2)} type="button" onClick={() => onMoveWeek(1)}>下一周</button>
          </>
        ) : view === "24h" ? (
          <>
            <button style={motionStyle(1)} type="button" onClick={() => onMoveDay(-1)}>上一天</button>
            <button style={motionStyle(2)} type="button" onClick={() => onMoveDay(1)}>下一天</button>
          </>
        ) : (
          <>
            <button style={motionStyle(1)} type="button" onClick={() => onMoveMonth(-1)}>上个月</button>
            <button style={motionStyle(2)} type="button" onClick={() => onMoveMonth(1)}>下个月</button>
          </>
        )}
      </div>
    </div>
  );
}
