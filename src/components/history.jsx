import { AlertCircle, AlertTriangle, Calendar, CheckCircle, Clock, Search, XCircle } from 'lucide-react';
import { useState } from 'react';

// history: [{date, imageName, imageUrl, supplements:[{name, overallSafety, reasons, shouldTake, confidence, reasoning, ...}]}]
const HistoryPage = ({ setCurrentPage, history }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDate, setSelectedDate] = useState('');
    const [expandedItems, setExpandedItems] = useState(new Set());

    const filteredHistory = history.filter(item => {
        const matchesSearch = searchTerm === '' ||
            (item.supplements && Array.isArray(item.supplements) && item.supplements.some(supplement =>
                supplement.name && typeof supplement.name === 'string' && supplement.name.toLowerCase().includes(searchTerm.toLowerCase())
            ));
        const matchesDate = selectedDate === '' ||
            new Date(item.date).toDateString() === new Date(selectedDate).toDateString();
        return matchesSearch && matchesDate;
    });

    // 렌더링 도우미
    const getSafetyIcon = (safety) => {
        switch (safety) {
            case 'safe': return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'caution': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
            case 'danger': return <XCircle className="w-4 h-4 text-red-500" />;
            default: return <AlertCircle className="w-4 h-4 text-gray-500" />;
        }
    };
    const getRecommendationIcon = (shouldTake) => {
        if (shouldTake === true) return <CheckCircle className="w-4 h-4 text-green-500" />;
        if (shouldTake === false) return <XCircle className="w-4 h-4 text-red-500" />;
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const toggleExpanded = (index) => {
        const newExpanded = new Set(expandedItems);
        if (newExpanded.has(index)) newExpanded.delete(index);
        else newExpanded.add(index);
        setExpandedItems(newExpanded);
    };

    return (
        <div className="p-6 bg-white rounded-xl shadow-md">
            <div className="flex items-center mb-6">
                <Clock className="w-8 h-8 text-purple-500 mr-3" />
                <h2 className="text-2xl font-bold text-gray-800">영양제 검색 히스토리</h2>
            </div>
            {/* 검색/필터 */}
            <div className="mb-6 space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="영양제 이름으로 검색..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                    </div>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                    </div>
                </div>
                {(searchTerm || selectedDate) && (
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">{filteredHistory.length}개의 결과 찾음</span>
                        <button
                            onClick={() => { setSearchTerm(''); setSelectedDate(''); }}
                            className="text-sm text-purple-600 hover:text-purple-800"
                        >
                            필터 초기화
                        </button>
                    </div>
                )}
            </div>
            {/* 히스토리 목록 */}
            <div className="space-y-4">
                {filteredHistory.length === 0 ? (
                    <div className="text-center py-12">
                        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 mb-2">
                            {history.length === 0 ? '아직 인식한 영양제가 없습니다' : '검색 결과가 없습니다'}
                        </p>
                        <p className="text-sm text-gray-500">
                            {history.length === 0 ? '영양제 인식 기능을 사용해보세요!' : '다른 검색어나 날짜를 시도해보세요'}
                        </p>
                    </div>
                ) : (
                    filteredHistory.map((item, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                            {/* 상단 섹션: 날짜 */}
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center">
                                    <Clock className="w-5 h-5 text-purple-500 mr-2" />
                                    <span className="font-medium text-gray-800">{formatDate(item.date)}</span>
                                </div>
                            </div>
                            {/* 영양제 사진 및 요약 */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div className="flex items-start">
                                    {item.imageUrl && (
                                        <img
                                            src={item.imageUrl}
                                            alt={item.imageName || '영양제 사진'}
                                            className="w-24 h-24 object-cover rounded-md mr-4 border border-gray-200 flex-shrink-0"
                                        />
                                    )}
                                    <div>
                                        <h4 className="font-medium text-gray-800 mb-2">인식된 영양제</h4>
                                        <div className="space-y-2">
                                            {item.supplements && item.supplements.length > 0 ? (
                                                item.supplements.map((supp, suppIndex) => (
                                                    <div key={suppIndex} className="flex flex-col border-b pb-2 mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-semibold">{supp.name}</span>
                                                            {getSafetyIcon(supp.overallSafety)}
                                                            <span className="text-xs">{supp.overallSafety}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            {getRecommendationIcon(supp.shouldTake)}
                                                            <span className="text-xs">
                                                                복용적합도: <b>
                                                                    {supp.shouldTake === true ? "권장"
                                                                        : supp.shouldTake === false ? "비권장"
                                                                            : "판단불가"}
                                                                </b>
                                                                {supp.confidence !== undefined && <> ({Math.round(supp.confidence * 100)}%)</>}
                                                            </span>
                                                        </div>
                                                        {supp.reasoning && (
                                                            <div className="text-xs text-gray-600 mt-1">{supp.reasoning}</div>
                                                        )}
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-sm text-gray-500">정보 없음</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* 상세 토글 */}
                            <div>
                                <button
                                    onClick={() => toggleExpanded(index)}
                                    className="text-sm text-purple-600 hover:text-purple-800 flex items-center gap-1"
                                >
                                    {expandedItems.has(index) ? <>간략히 보기</> : <>자세히 보기</>}
                                </button>
                                {expandedItems.has(index) && (
                                    <div className="pt-3 space-y-2">
                                        {item.supplements && item.supplements.map((supp, i) => (
                                            <div key={i} className="p-3 rounded border bg-gray-50">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-semibold">{supp.name}</span>
                                                    {getSafetyIcon(supp.overallSafety)}
                                                    <span className="text-xs">{supp.overallSafety}</span>
                                                </div>
                                                {supp.reasons && supp.reasons.length > 0 && (
                                                    <div className="text-xs mb-1">
                                                        <b>주의 사유: </b>
                                                        <ul className="list-disc list-inside ml-4">
                                                            {supp.reasons.map((r, j) => <li key={j}>{r}</li>)}
                                                        </ul>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-2 mt-1">
                                                    {getRecommendationIcon(supp.shouldTake)}
                                                    <span className="text-xs">
                                                        복용적합도: <b>
                                                            {supp.shouldTake === true ? "권장"
                                                                : supp.shouldTake === false ? "비권장"
                                                                    : "판단불가"}
                                                        </b>
                                                        {supp.confidence !== undefined && <> ({Math.round(supp.confidence * 100)}%)</>}
                                                    </span>
                                                </div>
                                                {supp.reasoning && (
                                                    <div className="text-xs text-gray-600 mt-1">{supp.reasoning}</div>
                                                )}
                                                {supp.precautions && supp.precautions.length > 0 && (
                                                    <div className="text-xs mt-1">
                                                        <b>주의사항: </b>
                                                        <ul className="list-disc list-inside ml-4">{supp.precautions.map((p, k) => <li key={k}>{p}</li>)}</ul>
                                                    </div>
                                                )}
                                                {supp.alternatives && supp.alternatives.length > 0 && (
                                                    <div className="text-xs mt-1">
                                                        <b>대안: </b>
                                                        <ul className="list-disc list-inside ml-4">{supp.alternatives.map((alt, m) => <li key={m}>{alt}</li>)}</ul>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
            <div className="mt-6">
                <button
                    onClick={() => setCurrentPage('main')}
                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
                >
                    대시보드로 돌아가기
                </button>
            </div>
        </div>
    );
};

export default HistoryPage;