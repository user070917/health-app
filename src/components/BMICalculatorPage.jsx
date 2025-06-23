// components/BMICalculatorPage.jsx
import { Calculator } from 'lucide-react';
import { useEffect, useState } from 'react';

const BMICalculatorPage = ({ user, setUser }) => {
    const [weight, setWeight] = useState(user?.weight || '');
    const [height, setHeight] = useState(user?.height || '');
    const [bmiResult, setBmiResult] = useState(user?.bmi || null);
    const [bmiCategory, setBmiCategory] = useState(null);

    // user prop이 변경될 때마다 체중, 신장, BMI를 업데이트합니다.
    useEffect(() => {
        setWeight(user?.weight || '');
        setHeight(user?.height || '');
        setBmiResult(user?.bmi || null);
        if (user?.bmi) {
            updateBMICategory(parseFloat(user.bmi));
        } else {
            setBmiCategory(null);
        }
    }, [user]);

    const calculateBMI = () => {
        if (weight && height) {
            const heightInM = parseFloat(height) / 100;
            const bmi = (parseFloat(weight) / (heightInM * heightInM)).toFixed(1);
            setBmiResult(bmi);
            updateBMICategory(bmi);
            // BMI 계산 후 사용자 데이터 업데이트
            setUser(prevUser => ({
                ...prevUser,
                weight: parseFloat(weight),
                height: parseFloat(height),
                bmi: bmi
            }));
        } else {
            setBmiResult(null);
            setBmiCategory(null);
        }
    };

    const updateBMICategory = (bmi) => {
        if (bmi < 18.5) return setBmiCategory({ category: '저체중', color: 'text-blue-600', bg: 'bg-blue-50' });
        if (bmi < 23) return setBmiCategory({ category: '정상', color: 'text-green-600', bg: 'bg-green-50' });
        if (bmi < 25) return setBmiCategory({ category: '과체중 전단계', color: 'text-yellow-600', bg: 'bg-yellow-50' });
        if (bmi < 30) return setBmiCategory({ category: '비만 1단계', color: 'text-orange-600', bg: 'bg-orange-50' });
        return setBmiCategory({ category: '비만 2단계', color: 'text-red-600', bg: 'bg-red-50' });
    };

    return (
        <div className="p-6 bg-white rounded-xl shadow-md">
            <div className="flex items-center mb-6">
                <Calculator className="w-8 h-8 text-blue-500 mr-3" />
                <h2 className="text-2xl font-bold text-gray-800">BMI 계산기</h2>
            </div>

            <div className="space-y-4 mb-6">
                <div>
                    <label htmlFor="weight" className="block text-sm font-medium text-gray-700 mb-1">
                        체중 (kg)
                    </label>
                    <input
                        type="number"
                        id="weight"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="예: 70"
                    />
                </div>
                <div>
                    <label htmlFor="height" className="block text-sm font-medium text-gray-700 mb-1">
                        신장 (cm)
                    </label>
                    <input
                        type="number"
                        id="height"
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="예: 175"
                    />
                </div>
                <button
                    onClick={calculateBMI}
                    className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition-colors font-semibold"
                >
                    BMI 계산

                </button>

            </div>

            {bmiResult && bmiCategory && (
                <div className={`p-5 rounded-lg ${bmiCategory.bg} border-l-4 border-blue-500`}>
                    <p className="text-lg font-medium text-gray-800 mb-2">
                        당신의 BMI는 <span className={`font-bold text-2xl ${bmiCategory.color}`}>{bmiResult}</span> 입니다.
                    </p>
                    <p className={`text-md font-semibold ${bmiCategory.color}`}>
                        {bmiCategory.category}
                    </p>
                    <p className="text-sm text-gray-600 mt-2">
                        BMI는 신체 질량을 나타내는 지표로, 건강 상태를 파악하는 데 도움이 됩니다.
                    </p>
                </div>
            )}
        </div>
    );
};

export default BMICalculatorPage;