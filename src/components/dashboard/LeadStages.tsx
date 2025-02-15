import React from 'react';
import { LeadStage } from '../../types';
import { Check, User } from 'lucide-react';

interface LeadStagesProps {
  stages: LeadStage[];
  onStageComplete: (stageId: string) => void;
  readOnly?: boolean;
}

export default function LeadStages({ stages, onStageComplete, readOnly = false }: LeadStagesProps) {
  return (
    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
      {stages.map((stage) => (
        <div
          key={stage.id}
          className={`flex items-center gap-3 p-2 rounded-lg transition-colors duration-200 ${
            stage.completed ? 'bg-green-500/10' : 'bg-gray-700'
          }`}
        >
          {!readOnly ? (
            <button
              onClick={() => onStageComplete(stage.id)}
              className={`min-w-[1.25rem] h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 transform active:scale-90 ${
                stage.completed
                  ? 'border-green-500 bg-green-500 text-white shadow-lg shadow-green-500/20'
                  : 'border-gray-500 hover:border-green-500 hover:bg-green-500/10'
              }`}
            >
              {stage.completed && <Check className="w-3 h-3" />}
            </button>
          ) : (
            <div
              className={`min-w-[1.25rem] h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                stage.completed
                  ? 'border-green-500 bg-green-500 text-white'
                  : 'border-gray-500'
              }`}
            >
              {stage.completed && <Check className="w-3 h-3" />}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-white text-sm font-medium truncate">{stage.title}</h4>
              {stage.completedBy && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-xs">
                  <User className="w-3 h-3" />
                  <span>{stage.completedBy.name}</span>
                </div>
              )}
            </div>
            {stage.completedAt && (
              <p className="text-xs text-gray-400">
                Completed {new Date(stage.completedAt).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}