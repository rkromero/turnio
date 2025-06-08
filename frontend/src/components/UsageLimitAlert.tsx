import React from 'react';
import { AlertTriangle, X, ArrowUp, Crown } from 'lucide-react';
import { UsageLimitWarning, PlanTier } from '../types/plans';

interface UsageLimitAlertProps {
  warning: UsageLimitWarning;
  onUpgrade: (targetPlan: PlanTier) => void;
  onDismiss: () => void;
}

const UsageLimitAlert: React.FC<UsageLimitAlertProps> = ({
  warning,
  onUpgrade,
  onDismiss
}) => {
  const getSeverityStyles = () => {
    switch (warning.severity) {
      case 'exceeded':
        return {
          container: 'bg-red-50 border-red-200',
          icon: 'text-red-600',
          text: 'text-red-800',
          button: 'bg-red-600 hover:bg-red-700 text-white'
        };
      case 'critical':
        return {
          container: 'bg-orange-50 border-orange-200',
          icon: 'text-orange-600',
          text: 'text-orange-800',
          button: 'bg-orange-600 hover:bg-orange-700 text-white'
        };
      case 'warning':
        return {
          container: 'bg-yellow-50 border-yellow-200',
          icon: 'text-yellow-600',
          text: 'text-yellow-800',
          button: 'bg-yellow-600 hover:bg-yellow-700 text-white'
        };
      default:
        return {
          container: 'bg-blue-50 border-blue-200',
          icon: 'text-blue-600',
          text: 'text-blue-800',
          button: 'bg-blue-600 hover:bg-blue-700 text-white'
        };
    }
  };

  const styles = getSeverityStyles();

  const getProgressBarColor = () => {
    if (warning.percentage >= 100) return 'bg-red-500';
    if (warning.percentage >= 95) return 'bg-orange-500';
    if (warning.percentage >= 80) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  const getSeverityTitle = () => {
    switch (warning.severity) {
      case 'exceeded': return '¡Límite Excedido!';
      case 'critical': return '¡Límite Crítico!';
      case 'warning': return 'Límite Próximo';
      default: return 'Información';
    }
  };

  return (
    <div className={`rounded-lg border p-4 ${styles.container}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <AlertTriangle className={`w-5 h-5 mt-0.5 ${styles.icon}`} />
          
          <div className="flex-1">
            <h4 className={`font-medium ${styles.text}`}>
              {getSeverityTitle()}
            </h4>
            
            <p className={`text-sm mt-1 ${styles.text}`}>
              {warning.message}
            </p>

            {/* Progress Bar */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className={styles.text}>Uso actual</span>
                <span className={styles.text}>
                  {Math.min(warning.percentage, 100).toFixed(0)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor()}`}
                  style={{ width: `${Math.min(warning.percentage, 100)}%` }}
                />
              </div>
            </div>

            {/* Upgrade message */}
            {warning.upgradeMessage && warning.targetPlan && (
              <div className="mt-3 flex items-center justify-between">
                <p className={`text-xs ${styles.text}`}>
                  {warning.upgradeMessage}
                </p>
                <button
                  onClick={() => onUpgrade(warning.targetPlan!)}
                  className={`inline-flex items-center space-x-1 px-3 py-1 rounded-md text-xs font-medium transition-colors ${styles.button}`}
                >
                  <Crown className="w-3 h-3" />
                  <span>Upgrade</span>
                  <ArrowUp className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={onDismiss}
          className={`p-1 rounded-md hover:bg-gray-100 transition-colors ${styles.icon}`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default UsageLimitAlert; 