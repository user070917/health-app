import { Heart } from 'lucide-react';
import { useState } from 'react';

const LoginPage = ({ onLogin }) => {
    const [isRegistering, setIsRegistering] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        name: '',
        weight: '',
        height: '',
        age: '',
        gender: '',
        diseases: [],
        activityLevel: ''
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleDiseaseChange = (disease) => {
        setFormData(prev => ({
            ...prev,
            diseases: prev.diseases.includes(disease)
                ? prev.diseases.filter(d => d !== disease)
                : [...prev.diseases, disease]
        }));
    };

    const calculateBMI = (weight, height) => {
        if (!weight || !height || height === 0) return '알수 없음';
        const heightInM = height / 100;
        return (weight / (heightInM * heightInM)).toFixed(1);
    };

    const handleSubmit = () => {
        if (isRegistering) {
            // 회원가입 처리
            const newUser = {
                ...formData,
                bmi: calculateBMI(formData.weight, formData.height)
            };
            onLogin(newUser);
        } else {
            // 로그인 처리 (데모용)
            const loginUser = {
                name: formData.email.split('@')[0],
                email: formData.email
            };
            onLogin(loginUser);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center mb-4">
                        <Heart className="w-8 h-8 text-red-500 mr-2" />
                        <h1 className="text-2xl font-bold text-gray-800">헬스케어 매니저</h1>
                    </div>
                    <p className="text-gray-600">
                        {isRegistering ? '건강한 삶의 시작' : '건강 관리의 파트너'}
                    </p>
                </div>

                <div className="space-y-4">
                    <div>
                        <input
                            type="email"
                            name="email"
                            placeholder="이메일"
                            value={formData.email}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>

                    <div>
                        <input
                            type="password"
                            name="password"
                            placeholder="비밀번호"
                            value={formData.password}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>

                    {isRegistering && (
                        <>
                            <div>
                                <input
                                    type="text"
                                    name="name"
                                    placeholder="이름"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <input
                                    type="number"
                                    name="weight"
                                    placeholder="체중(kg)"
                                    value={formData.weight}
                                    onChange={handleInputChange}
                                    className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                                <input
                                    type="number"
                                    name="height"
                                    placeholder="신장(cm)"
                                    value={formData.height}
                                    onChange={handleInputChange}
                                    className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <input
                                    type="number"
                                    name="age"
                                    placeholder="나이"
                                    value={formData.age}
                                    onChange={handleInputChange}
                                    className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                                <select
                                    name="gender"
                                    value={formData.gender}
                                    onChange={handleInputChange}
                                    className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                >
                                    <option value="">성별</option>
                                    <option value="male">남성</option>
                                    <option value="female">여성</option>
                                </select>
                            </div>

                            <div>
                                <p className="text-sm font-medium text-gray-700 mb-2">기존 질환 (해당사항 선택)</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {['당뇨병', '고혈압', '심장병', '관절염', '기타'].map(disease => (
                                        <label key={disease} className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                checked={formData.diseases.includes(disease)}
                                                onChange={() => handleDiseaseChange(disease)}
                                                className="w-4 h-4 text-blue-600"
                                            />
                                            <span className="text-sm">{disease}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <select
                                    name="activityLevel"
                                    value={formData.activityLevel}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                >
                                    <option value="">활동 수준</option>
                                    <option value="low">낮음 (주로 앉아서 생활)</option>
                                    <option value="moderate">보통 (가벼운 운동)</option>
                                    <option value="high">높음 (규칙적인 운동)</option>
                                </select>
                            </div>
                        </>
                    )}

                    <button
                        type="button"
                        onClick={handleSubmit}
                        className="w-full bg-gradient-to-r from-blue-500 to-green-500 text-white py-3 rounded-lg hover:from-blue-600 hover:to-green-600 transition-all duration-200 font-semibold"
                    >
                        {isRegistering ? '회원가입' : '로그인'}
                    </button>
                </div>

                <div className="text-center mt-6">
                    <button
                        onClick={() => setIsRegistering(!isRegistering)}
                        className="text-blue-500 hover:text-blue-700 text-sm"
                    >
                        {isRegistering ? '이미 계정이 있으신가요? 로그인' : '계정이 없으신가요? 회원가입'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;