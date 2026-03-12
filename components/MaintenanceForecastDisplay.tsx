import React from 'react';
import { MaintenanceForecast, MaintenanceInsight } from '../types.ts';
import { LightBulbIcon, ExclamationTriangleIcon } from './icons.tsx';

interface MaintenanceForecastDisplayProps {
    forecast: MaintenanceForecast;
}

const severityStyles = {
    low: {
        iconColor: 'text-sky-400',
        borderColor: 'border-sky-700',
        bgColor: 'bg-sky-900/50',
    },
    medium: {
        iconColor: 'text-yellow-400',
        borderColor: 'border-yellow-700',
        bgColor: 'bg-yellow-900/50',
    },
    high: {
        iconColor: 'text-red-400',
        borderColor: 'border-red-700',
        bgColor: 'bg-red-900/50',
    }
};

const InsightCard: React.FC<{ insight: MaintenanceInsight }> = ({ insight }) => {
    const styles = severityStyles[insight.severity];
    return (
        <div className={`p-4 rounded-lg border-l-4 ${styles.borderColor} ${styles.bgColor}`}>
            <div className="flex items-start gap-3">
                 <ExclamationTriangleIcon className={`w-6 h-6 flex-shrink-0 ${styles.iconColor}`} />
                <div>
                    <h5 className="font-bold text-white capitalize">{insight.severity} Priority Insight</h5>
                    <p className="text-sm text-slate-400 mt-2"><strong className="text-slate-300">Identified Pattern:</strong> {insight.pattern}</p>
                    <p className="text-sm text-slate-400 mt-1"><strong className="text-slate-300">Prediction:</strong> {insight.prediction}</p>
                    <p className="text-sm text-slate-400 mt-1"><strong className="text-slate-300">Recommendation:</strong> {insight.recommendation}</p>
                </div>
            </div>
        </div>
    );
};

export const MaintenanceForecastDisplay: React.FC<MaintenanceForecastDisplayProps> = ({ forecast }) => {
    return (
        <div className="mt-8">
            <h3 className="text-2xl font-bold text-white flex items-center gap-2 mb-4">
                <LightBulbIcon className="w-7 h-7 text-yellow-400" />
                Predictive Insights
            </h3>
            <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 space-y-4">
                <div>
                    <h4 className="font-semibold text-slate-300">AI Summary</h4>
                    <p className="text-slate-400 italic mt-1">{forecast.summary}</p>
                </div>

                {forecast.insights.length > 0 ? (
                     <div className="space-y-4 pt-4 border-t border-slate-700">
                        {forecast.insights.map((insight, index) => (
                            <InsightCard key={index} insight={insight} />
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-slate-500 pt-4 border-t border-slate-700">No specific predictive maintenance actions were identified from the logbook history.</p>
                )}
            </div>
        </div>
    );
};