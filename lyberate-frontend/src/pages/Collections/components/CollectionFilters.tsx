import { FileText, Clock } from 'lucide-react';
import { FilterPreset } from '../hooks/useCollectionsFilter';
import { WeeklyFilterBar } from '../../../components/WeeklyFilterBar';

interface Props {
    activeTab: 'list' | 'approvals';
    setActiveTab: (tab: 'list' | 'approvals') => void;
    pendingCount: number;
    filterPreset: FilterPreset;
    setFilterPreset: (preset: FilterPreset) => void;
    rangeStart: string;
    rangeEnd: string;
    snapToWeek: (dateStr: string) => void;
    searchQuery: string;
    setSearchQuery: (val: string) => void;
}

export const CollectionFilters = ({
    activeTab, setActiveTab, pendingCount,
    filterPreset, setFilterPreset,
    rangeStart, rangeEnd, snapToWeek,
    searchQuery, setSearchQuery
}: Props) => {
    return (
        <div className="glass-panel p-4 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-xl w-full md:w-auto overflow-x-auto no-scrollbar">
                <button
                    onClick={() => setActiveTab('list')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === 'list' ? 'bg-white dark:bg-black/80 shadow-sm text-ios-text' : 'text-ios-subtext hover:text-ios-text'}`}
                >
                    <FileText size={15} /> Lista de Cobros
                </button>
                <button
                    onClick={() => setActiveTab('approvals')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === 'approvals' ? 'bg-white dark:bg-black/80 shadow-sm text-ios-text' : 'text-ios-subtext hover:text-ios-text'}`}
                >
                    <Clock size={15} /> Comprobantes Pendientes
                    {pendingCount > 0 && (
                        <span className="bg-orange-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{pendingCount}</span>
                    )}
                </button>
            </div>

            <WeeklyFilterBar
                filterPreset={filterPreset}
                setFilterPreset={setFilterPreset}
                rangeStart={rangeStart}
                rangeEnd={rangeEnd}
                snapToWeek={snapToWeek}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
            />
        </div>
    );
};
