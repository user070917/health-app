import { doc, getDoc } from 'firebase/firestore';
import { AlertTriangle, Camera, CheckCircle, User, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { auth, db } from './Firebase.jsx';

const FoodRecognitionPage = ({ setCurrentPage, addToHistory }) => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [recognitionResult, setRecognitionResult] = useState(null); // Flask에서 받은 영양제/영양소 정보
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [userData, setUserData] = useState(null);
    const [suitabilityAnalysis, setSuitabilityAnalysis] = useState(null); // GPT 적합도 분석 결과
    const [imagePreview, setImagePreview] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchUserData();
    }, []);

    const fetchUserData = async () => {
        try {
            const user = auth.currentUser;
            if (!user) {
                setError('사용자 정보를 찾을 수 없습니다.');
                return;
            }
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
                setUserData(userDoc.data());
            } else {
                setError('사용자 데이터를 찾을 수 없습니다.');
            }
        } catch (error) {
            console.error('사용자 정보 가져오기 실패:', error);
            setError('사용자 정보를 불러오는 중 오류가 발생했습니다.');
        }
    };

    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                setError('파일 크기가 5MB를 초과합니다.');
                return;
            }
            if (!file.type.startsWith('image/')) {
                setError('이미지 파일만 업로드 가능합니다.');
                return;
            }
            setSelectedFile(file);
            setRecognitionResult(null);
            setSuitabilityAnalysis(null);
            setError('');
            const reader = new FileReader();
            reader.onload = (e) => setImagePreview(e.target.result);
            reader.readAsDataURL(file);
        }
    };

    // 1. Flask 서버로 이미지 업로드, 영양제/영양소 정보 반환
    const recognizeSupplementWithFlask = async (imageFile, userUid) => {
        const formData = new FormData();
        formData.append("image", imageFile);
        formData.append("uid", userUid);

        const res = await fetch('http://localhost:5001/predict', {
            method: 'POST',
            body: formData,
        });
        if (!res.ok) {
            let data = {};
            try {
                data = await res.json();
            } catch (e) { }
            throw new Error(data.error || '영양제 인식 실패');
        }
        return await res.json(); // { supplementName, totalNutrients, ... }
    };

    // 2. GPT로 적합도 분석 (파이썬에서 받은 영양소/영양제 정보 + 사용자 정보만 활용)
    const analyzeSuitabilityWithGPT = async (flaskResult, userData) => {
        const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;

        if (!OPENAI_API_KEY) {
            throw new Error('OpenAI API 키가 설정되지 않았습니다.');
        }

        const prompt = `
당신은 영양제 복용에 대한 전문적인 조언을 제공하는 AI 의사입니다.

사용자 정보:
- 나이: ${userData?.age || '정보 없음'}
- 성별: ${userData?.gender === 'male' ? '남성' : userData?.gender === 'female' ? '여성' : '정보 없음'}
- 기저질환: ${userData?.diseases && userData.diseases.length > 0 ? userData.diseases.join(', ') : '없음'}

영양제 정보:
- 제품명: ${flaskResult.supplementName || '정보 없음'}
- 주요 영양소: ${flaskResult.totalNutrients ? Object.entries(flaskResult.totalNutrients).map(([nutrient, amount]) => `${nutrient}: ${amount}`).join(', ') : '정보 없음'}

위 정보를 바탕으로 해당 영양제의 복용 적합도를 판단하세요.
반드시 아래 JSON 형식으로만 응답하세요. 다른 설명은 절대 포함하지 마세요.
{
  "shouldTake": true/false/null,
  "confidence": 0.0~1.0,
  "reasoning": "복용 권장/비권장 사유",
  "precautions": [],
  "alternatives": []
}
`;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 800,
                temperature: 0.1
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenAI 적합도 분석 API 호출 실패: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const content = data.choices[0].message.content;
        try {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('GPT 응답에서 JSON 객체를 찾을 수 없습니다.');
            }
        } catch (parseError) {
            throw new Error('적합도 분석 응답을 파싱할 수 없습니다: ' + parseError.message);
        }
    };

    // 메인 분석 함수
    const analyzeSupplements = async () => {
        if (!selectedFile) {
            setError('분석할 이미지를 선택해주세요.');
            return;
        }
        if (!userData) {
            setError('사용자 건강 정보를 불러올 수 없습니다. 다시 로그인하거나 정보를 확인해주세요.');
            return;
        }

        setIsAnalyzing(true);
        setError('');

        try {
            // 1. Flask로 이미지 전송 → 영양제/영양소 정보 획득
            const flaskResult = await recognizeSupplementWithFlask(selectedFile, auth.currentUser.uid);
            setRecognitionResult(flaskResult);

            // 2. GPT로 적합도 분석만 요청 (영양소 정보 기반)
            const suitabilityResult = await analyzeSuitabilityWithGPT(flaskResult, userData);
            setSuitabilityAnalysis(suitabilityResult);

            // 3. 히스토리 저장
            addToHistory({
                date: new Date().toISOString(),
                supplementName: flaskResult.supplementName,
                totalNutrients: flaskResult.totalNutrients,
                imageName: selectedFile.name,
                imagePreviewData: imagePreview,
                suitabilityAnalysis: suitabilityResult
            });

        } catch (error) {
            setError(`분석 중 오류가 발생했습니다: ${error.message}. 다시 시도해주세요.`);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const getSuitabilityIcon = (shouldTake) => {
        if (shouldTake === true) return <CheckCircle className="w-5 h-5 text-green-500" />;
        if (shouldTake === false) return <XCircle className="w-5 h-5 text-red-500" />;
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    };

    const getSuitabilityColor = (shouldTake) => {
        if (shouldTake === true) return 'bg-green-50 border-green-200';
        if (shouldTake === false) return 'bg-red-50 border-red-200';
        return 'bg-yellow-50 border-yellow-200';
    };

    return (
        <div className="p-6 bg-white rounded-xl shadow-md max-w-4xl mx-auto">
            <div className="flex items-center mb-6">
                <Camera className="w-8 h-8 text-blue-500 mr-3" />
                <h2 className="text-2xl font-bold text-gray-800">AI 영양제 복용 적합도 분석</h2>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700">{error}</p>
                </div>
            )}

            {/* 사용자 건강 정보 */}
            {userData && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center mb-2">
                        <User className="w-5 h-5 text-blue-600 mr-2" />
                        <h3 className="font-medium text-blue-800">사용자 건강 정보</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-3">
                        <div className="text-sm text-blue-700">
                            <span className="font-medium">나이:</span> {userData.age}세
                        </div>
                        <div className="text-sm text-blue-700">
                            <span className="font-medium">성별:</span> {userData.gender === 'male' ? '남성' : '여성'}
                        </div>
                    </div>
                    <div>
                        <span className="font-medium text-blue-800">기저질환:</span>
                        <div className="flex flex-wrap gap-2 mt-1">
                            {userData.diseases && userData.diseases.length > 0 ? (
                                userData.diseases.map((name) => (
                                    <span key={name} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                                        {name}
                                    </span>
                                ))
                            ) : (
                                <span className="text-blue-600 text-sm">없음</span>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-6">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="file-upload"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                        <Camera className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 mb-2">영양제 사진을 업로드하세요</p>
                        <p className="text-sm text-gray-500">JPG, PNG 파일을 지원합니다 (최대 5MB)</p>
                    </label>
                </div>

                {imagePreview && (
                    <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-2">업로드된 이미지:</p>
                        <img src={imagePreview} alt="업로드된 영양제" className="max-w-xs mx-auto rounded-lg shadow-sm" />
                        <p className="font-medium mt-2 text-center">{selectedFile?.name}</p>
                        <button
                            onClick={analyzeSupplements}
                            disabled={isAnalyzing || !userData}
                            className="mt-4 bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-400 w-full"
                        >
                            {isAnalyzing ? 'AI 분석 중...' : 'AI로 영양제 적합도 분석하기'}
                        </button>
                        {!userData && (
                            <p className="text-red-500 text-xs mt-2 text-center">
                                정확한 분석을 위해 사용자 정보를 설정해주세요.
                            </p>
                        )}
                    </div>
                )}

                {/* Flask에서 인식된 영양제/영양소 정보 */}
                {recognitionResult && (
                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold text-gray-800">인식된 영양제 정보</h3>
                        <div className="bg-green-50 rounded-lg p-4">
                            <div className="font-medium text-green-800 mb-3">제품명: {recognitionResult.supplementName}</div>
                            <div>
                                <span className="font-medium text-gray-700">주요 영양소:</span>
                                <div className="flex flex-wrap gap-2 mt-1">
                                    {recognitionResult.totalNutrients
                                        ? Object.entries(recognitionResult.totalNutrients).map(([nutrient, amount]) => (
                                            <span key={nutrient} className="text-xs bg-gray-100 px-2 py-1 rounded">
                                                {nutrient}: {amount}
                                            </span>
                                        ))
                                        : <span className="text-sm text-gray-500">정보 없음</span>}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* GPT 적합도 분석 결과 */}
                {suitabilityAnalysis && (
                    <div className="space-y-4">
                        <h4 className="font-medium text-gray-800">복용 적합도 분석 결과</h4>
                        <div className={`p-4 rounded-lg border ${getSuitabilityColor(suitabilityAnalysis.shouldTake)}`}>
                            <div className="flex items-center gap-2 mb-2">
                                {getSuitabilityIcon(suitabilityAnalysis.shouldTake)}
                                <span className="text-base font-bold">
                                    {suitabilityAnalysis.shouldTake === true ? '복용 권장'
                                        : suitabilityAnalysis.shouldTake === false ? '복용 비권장'
                                            : '신중히 고려'}
                                </span>
                                {typeof suitabilityAnalysis.confidence === 'number' && (
                                    <span className="text-sm text-gray-600">({Math.round(suitabilityAnalysis.confidence * 100)}% 신뢰도)</span>
                                )}
                            </div>
                            <div className="text-sm text-gray-700 mb-2">
                                {suitabilityAnalysis.reasoning}
                            </div>
                            {suitabilityAnalysis.precautions && suitabilityAnalysis.precautions.length > 0 && (
                                <div className="mb-1">
                                    <span className="font-medium text-gray-700">주의사항:</span>
                                    <ul className="list-disc list-inside ml-4 text-sm text-gray-700">
                                        {suitabilityAnalysis.precautions.map((p, i) => <li key={i}>{p}</li>)}
                                    </ul>
                                </div>
                            )}
                            {suitabilityAnalysis.alternatives && suitabilityAnalysis.alternatives.length > 0 && (
                                <div>
                                    <span className="font-medium text-gray-700">대안:</span>
                                    <ul className="list-disc list-inside ml-4 text-sm text-gray-700">
                                        {suitabilityAnalysis.alternatives.map((a, i) => <li key={i}>{a}</li>)}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="mt-6 flex gap-3">
                <button
                    onClick={() => setCurrentPage('main')}
                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
                >
                    대시보드로 돌아가기
                </button>
                {recognitionResult && (
                    <button
                        onClick={() => {
                            setSelectedFile(null);
                            setRecognitionResult(null);
                            setSuitabilityAnalysis(null);
                            setImagePreview(null);
                            setError('');
                        }}
                        className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
                    >
                        새 분석 시작
                    </button>
                )}
            </div>
        </div>
    );
};

export default FoodRecognitionPage;