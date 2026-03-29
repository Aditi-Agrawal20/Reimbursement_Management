import React from 'react';
import { Check, Clock, X } from 'lucide-react';

interface ApprovalProgressProps {
  currentStep: number;
  totalSteps: number;
  approvers: string[];
  status: 'pending' | 'approved' | 'rejected';
}

export const ApprovalProgress = ({ currentStep, totalSteps, approvers, status }: ApprovalProgressProps) => {
  return (
    <div className="flex items-center gap-1">
      {approvers.map((approver, i) => {
        const stepNum = i + 1;
        const isCompleted = stepNum < currentStep || status === 'approved';
        const isCurrent = stepNum === currentStep && status === 'pending';
        const isRejected = stepNum === currentStep && status === 'rejected';

        return (
          <React.Fragment key={i}>
            <div className="flex flex-col items-center gap-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                isCompleted ? 'bg-gradient-to-br from-emerald-400 to-teal-500 text-primary-foreground' :
                isCurrent ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-primary-foreground animate-pulse' :
                isRejected ? 'bg-gradient-to-br from-red-500 to-rose-600 text-primary-foreground' :
                'bg-muted text-muted-foreground'
              }`}>
                {isCompleted ? <Check className="w-3 h-3" /> :
                 isRejected ? <X className="w-3 h-3" /> :
                 isCurrent ? <Clock className="w-3 h-3" /> :
                 stepNum}
              </div>
              <span className="text-[9px] text-muted-foreground">{approver}</span>
            </div>
            {i < approvers.length - 1 && (
              <div className={`w-6 h-[2px] rounded-full mb-4 ${
                isCompleted ? 'bg-gradient-to-r from-emerald-400 to-teal-500' : 'bg-border'
              }`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
