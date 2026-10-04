import { dayDistance,dayInZone } from './dates';
import type { Loan,Settings } from './types';
import type { EmailKind } from './email';
export function reminderKind(loan:Loan,settings:Settings,today=dayInZone(new Date(),settings.timezone)):EmailKind|null {
 if(loan.returned_at)return null;
 const days=dayDistance(dayInZone(loan.due_at,settings.timezone),today);
 if(days===settings.due_soon_days&&days>0)return 'due_soon';
 if(days===0)return 'due_today';
 if(days<0&&(-days)%settings.overdue_repeat_days===0)return 'overdue';
 return null;
}
