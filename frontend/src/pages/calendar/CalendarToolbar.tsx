import type { CalendarView } from "../../app/types/common";
import { ActionButton, Toolbar } from "../../components/ui/primitives";
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
      <Toolbar className="calendar-month-actions" align="end" aria-label={view === "week" ? "周切换" : view === "24h" ? "日期切换" : "月份切换"}>
        <ActionButton style={motionStyle(0)} onClick={onJumpToToday}>今天</ActionButton>
        {view === "week" ? (
          <>
            <ActionButton style={motionStyle(1)} onClick={() => onMoveWeek(-1)}>上一周</ActionButton>
            <ActionButton style={motionStyle(2)} onClick={() => onMoveWeek(1)}>下一周</ActionButton>
          </>
        ) : view === "24h" ? (
          <>
            <ActionButton style={motionStyle(1)} onClick={() => onMoveDay(-1)}>上一天</ActionButton>
            <ActionButton style={motionStyle(2)} onClick={() => onMoveDay(1)}>下一天</ActionButton>
          </>
        ) : (
          <>
            <ActionButton style={motionStyle(1)} onClick={() => onMoveMonth(-1)}>上个月</ActionButton>
            <ActionButton style={motionStyle(2)} onClick={() => onMoveMonth(1)}>下个月</ActionButton>
          </>
        )}
      </Toolbar>
    </div>
  );
}
