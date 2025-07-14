from flask import Flask, request, jsonify
import torch
from torchvision import models, transforms
from PIL import Image
import io
import firebase_admin
from firebase_admin import credentials, firestore
from flask_cors import CORS
import openai
import os
from dotenv import load_dotenv
import json

# 환경 변수 로드
load_dotenv()

app = Flask(__name__)
CORS(app)

# Firebase 초기화
cred = credentials.Certificate('health-app-24924-firebase-adminsdk-fbsvc-5e6c7671ae.json')
firebase_admin.initialize_app(cred)
db = firestore.client()

# OpenAI API 키 설정
openai.api_key = os.getenv("OPENAI_API_KEY")

# 영양제 라벨
label2idx = {
    '글루코사민': 0, '루테인': 1, '마그네슘': 2, '망간': 3, '비타민A1': 4, '비타민A2': 5,
    '비타민B1(티아민)': 6, '비타민B12(코발라민)': 7, '비타민B2(리보플라빈)': 8, '비타민B3(니아신)': 9,
    '비타민B5(판토텐산)': 10, '비타민B6(피리독신)': 11, '비타민B9(엽산)': 12, '비타민C': 13,
    '비타민D': 14, '비타민E': 15, '비타민K1': 16, '비타민K2': 17, '셀레늄': 18, '아연': 19,
    '아이오딘': 20, '오메가3': 21, '유산균': 22, '철분': 23, '칼륨': 24, '칼슘': 25,
    '코엔자임Q10': 26, '콜라겐': 27, '크롬': 28, '홍삼': 29
}
idx2label = {v: k for k, v in label2idx.items()}

# 위험 성분 DB
danger_db = {
    '당뇨병': ['비타민B3(니아신)', '홍삼'],
    '고혈압': ['오메가3', '홍삼'],
    '심장병': ['코엔자임Q10', '오메가3'],
    '신장질환': ['마그네슘', '칼륨'],
    '간질환': ['비타민A1', '비타민A2'],
    '통풍': ['칼슘', '마그네슘'],
}

# 주요 영양제별 성분 DB 예시 (실제 프로젝트에선 DB/CSV 등에서 로드 가능)
supplement_nutrient_db = {
    "마그네슘": {"마그네슘": "350mg", "비타민B6": "20mg"},
    "비타민C": {"비타민C": "1000mg"},
    "비타민B6(피리독신)": {"비타민B6": "50mg"},
    "오메가3": {"EPA": "300mg", "DHA": "200mg"},
    "홍삼": {"진세노사이드": "10mg"},
    "철분": {"철분": "15mg"},
    "루테인": {"루테인": "20mg"},
    # ... 필요에 따라 추가
}

# 모델 로드
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = models.resnet18(weights=None)
model.fc = torch.nn.Linear(model.fc.in_features, len(label2idx))
model.load_state_dict(torch.load("nutrient_classifier.pth", map_location=device))
model = model.to(device)
model.eval()

transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
])

@app.route('/predict', methods=['POST'])
def predict():
    if 'image' not in request.files or 'uid' not in request.form:
        return jsonify({'error': 'Image and uid are required'}), 400
    
    file = request.files['image']
    uid = request.form['uid']
    img_bytes = file.read()
    img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    img_t = transform(img).unsqueeze(0).to(device)

    with torch.no_grad():
        out = model(img_t)
        pred = out.argmax(dim=1).item()
        supplement_name = idx2label[pred]

    user_doc = db.collection('users').document(uid).get()
    if not user_doc.exists:
        return jsonify({'error': 'User not found'}), 404
    user_data = user_doc.to_dict()
    user_diseases = user_data.get('diseases', [])

    overall_safety = "safe"
    reasons = []

    for disease in user_diseases:
        if not isinstance(disease, str) or disease == "없음":
            continue
        risky_ingredients = danger_db.get(disease, [])
        if supplement_name in risky_ingredients:
            overall_safety = "danger"
            reasons.append(f"{disease} 환자에게 {supplement_name}은 위험할 수 있습니다.")
    
    if overall_safety != "danger" and len(user_diseases) > 0:
        overall_safety = "caution"
        if len(reasons) == 0:
            reasons.append("알려진 위험 성분은 없지만 주의가 필요합니다.")

    # 주요 성분 정보 always 포함
    total_nutrients = supplement_nutrient_db.get(supplement_name, {"정보 없음": "정보 없음"})

    return jsonify({
        "supplementName": supplement_name,
        "totalNutrients": total_nutrients,
        "supplements": [{
            "name": supplement_name,
            "overallSafety": overall_safety,
            "reasons": reasons,
            "nutrients": total_nutrients  # supplements 배열 내부에도 주요 성분 정보 포함
        }]
    })

@app.route('/gpt-analysis', methods=['POST'])
def gpt_analysis():
    try:
        data = request.json
        user_info = data.get('userInfo', {})
        flask_analysis = data.get('flaskAnalysis', {})
        uid = user_info.get('uid')
        if not uid:
            return jsonify({'error': 'User ID is required'}), 400

        user_doc = db.collection('users').document(uid).get()
        if not user_doc.exists:
            return jsonify({'error': 'User not found'}), 404
        user_data = user_doc.to_dict()
        supplement_name = flask_analysis.get('name', '') or flask_analysis.get('supplementName', '')

        prompt = f"""
당신은 영양제 복용에 대한 전문적인 조언을 제공하는 AI 의사입니다.
사용자 정보:
- 나이: {user_data.get('age', '정보 없음')}
- 성별: {user_data.get('gender', '정보 없음')}
- 기존 질병: {user_data.get('diseases', [])}
- 현재 복용 중인 약물: {user_data.get('medications', [])}
- 알레르기: {user_data.get('allergies', [])}

영양제 정보:
- 제품명: {supplement_name}

기존 안전성 분석:
- 안전성 등급: {flask_analysis.get('overallSafety', '정보 없음')}
- 주의 사유: {flask_analysis.get('reasons', [])}

주요 성분 정보:
- {flask_analysis.get('nutrients', {})}

JSON 형식으로 응답해주세요:
{{
    "shouldTake": true/false/null,
    "confidence": 0.0-1.0,
    "reasoning": "추천 이유",
    "precautions": [],
    "alternatives": [],
    "dosageRecommendation": ""
}}
"""

        response = openai.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "당신은 영양제 전문 AI 의사입니다."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3
        )

        gpt_response = response.choices[0].message.content.strip()

        if '```json' in gpt_response:
            json_start = gpt_response.find('```json') + 7
            json_end = gpt_response.find('```', json_start)
            json_str = gpt_response[json_start:json_end].strip()
        else:
            json_start = gpt_response.find('{')
            json_end = gpt_response.rfind('}') + 1
            json_str = gpt_response[json_start:json_end]

        try:
            analysis_result = json.loads(json_str)
        except:
            analysis_result = {
                "shouldTake": None,
                "confidence": 0.5,
                "reasoning": "분석 실패. 의료 전문가와 상담하세요.",
                "precautions": ["의료 전문가 상담 필요"],
                "alternatives": [],
                "dosageRecommendation": "상담 필요"
            }

        return jsonify(analysis_result)

    except Exception as e:
        print(f"GPT 분석 에러: {str(e)}")
        return jsonify({
            "error": "GPT 분석 중 오류가 발생했습니다",
            "shouldTake": None,
            "confidence": 0.5,
            "reasoning": "시스템 오류로 분석 불가. 의료 전문가와 상담하세요.",
            "precautions": ["의료 전문가와 상담 후 복용하세요"],
            "alternatives": [],
            "dosageRecommendation": "전문가와 상담 후 결정하세요"
        }), 500

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5001)