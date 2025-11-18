# 보행환경 인식 설문조사 시스템

한 이미지에 대해 여러 항목(안전성, 쾌적성, 편리성, 접근성)을 1-5점으로 평가하는 설문조사 시스템입니다.

## 📋 주요 기능

- ✅ 한 이미지당 4가지 항목 평가 (1-5점 척도)
- ✅ GitHub에서 이미지 자동 로딩
- ✅ Google Sheets에 자동 저장
- ✅ 반응형 디자인 (모바일 지원)
- ✅ 실시간 진행률 표시
- ✅ 이전/다음 네비게이션

## 🎯 평가 항목

1. **🛡️ 안전성**: 이 장소는 안전하다고 느껴진다
2. **🌿 쾌적성**: 이 장소는 쾌적하다고 느껴진다
3. **🚶 편리성**: 이 장소는 보행하기 편리하다
4. **♿ 접근성**: 이 장소는 접근하기 쉽다

## 🚀 설치 및 설정 방법

### 1단계: GitHub 저장소 준비

1. GitHub에 새 저장소 생성 (Public으로 설정)
2. 저장소에 `images` 폴더 생성
3. `images` 폴더에 설문에 사용할 이미지 업로드 (.jpg, .png, .webp 등)

### 2단계: Google Sheets 설정

1. Google Sheets에서 새 스프레드시트 생성
2. 스프레드시트 URL에서 ID 복사
   ```
   https://docs.google.com/spreadsheets/d/[이부분이_SPREADSHEET_ID]/edit
   ```
3. **확장 프로그램 > Apps Script** 클릭
4. `app_script.gs` 파일의 내용을 모두 복사하여 붙여넣기
5. 코드 상단의 `SPREADSHEET_ID` 부분을 본인의 스프레드시트 ID로 수정
   ```javascript
   const SPREADSHEET_ID = "여기에_복사한_ID_붙여넣기";
   ```
6. **배포 > 새 배포** 클릭
7. 배포 설정:
   - 유형: **웹 앱**
   - 실행: **나**
   - 액세스 권한: **모든 사용자**
8. **배포** 버튼 클릭
9. 생성된 **웹 앱 URL** 복사 (나중에 사용)

### 3단계: 프론트엔드 코드 수정

1. `script.js` 파일을 텍스트 에디터로 열기
2. 상단의 설정 부분 수정:

```javascript
// GitHub 저장소 정보
const GITHUB = {
  owner: "본인의_GitHub_ID",        // 예: "johndoe"
  repo: "저장소_이름",               // 예: "survey-images"
  branch: "main",                   // 보통 "main"
  path: "images"                    // 이미지 폴더 이름
};

// Google Apps Script Web App URL
const APPS_SCRIPT_URL = "2단계에서_복사한_웹앱_URL_붙여넣기";

// 샘플 이미지 개수
const SAMPLE_SIZE = 20;  // 원하는 개수로 변경 가능
```

### 4단계: GitHub Pages로 배포

1. GitHub 저장소에 다음 파일들 업로드:
   - `index.html`
   - `script.js`
   - `style.css`

2. 저장소 설정:
   - **Settings > Pages** 이동
   - Source: **Deploy from a branch**
   - Branch: **main** 선택, 폴더: **/ (root)** 선택
   - **Save** 클릭

3. 몇 분 후 생성되는 URL로 접속:
   ```
   https://본인ID.github.io/저장소이름/
   ```

## 📊 데이터 구조

Google Sheets에 다음과 같이 저장됩니다:

| 타임스탬프 | 사용자 ID | 성별 | 연령대 | 이미지 ID | 이미지 순서 | 안전성 (1-5) | 쾌적성 (1-5) | 편리성 (1-5) | 접근성 (1-5) |
|----------|----------|-----|-------|----------|-----------|------------|------------|------------|------------|
| 2025-11-18... | user-123 | 남 | 20대 | image1.jpg | 1 | 4 | 3 | 5 | 4 |

## 🎨 커스터마이징

### 평가 항목 변경

`index.html`과 `script.js`에서 평가 항목을 수정할 수 있습니다:

**index.html** - 설문 질문 수정:
```html
<h4 class="rating-question">🛡️ 안전성: 이 장소는 안전하다고 느껴진다</h4>
```

**script.js** - 항목 이름 수정:
```javascript
const RATING_CATEGORIES = [
  { name: 'safety', label: '안전성' },
  { name: 'comfort', label: '쾌적성' },
  { name: 'convenience', label: '편리성' },
  { name: 'accessibility', label: '접근성' }
];
```

### 점수 범위 변경 (1-5점 → 다른 범위)

1. `index.html`에서 라디오 버튼 개수 조정
2. `script.js`에서 유효성 검사 로직 조정
3. `style.css`에서 `.rating-scale` 간격 조정

### 색상 테마 변경

`style.css`에서 그라디언트 색상 수정:
```css
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```

## 🔧 문제 해결

### 이미지가 로딩되지 않는 경우
- GitHub 저장소가 **Public**인지 확인
- `GITHUB` 설정이 정확한지 확인
- 이미지가 `images/` 폴더에 있는지 확인
- 브라우저 콘솔(F12)에서 에러 확인

### 데이터가 저장되지 않는 경우
- Apps Script 배포 시 **액세스 권한**이 "모든 사용자"인지 확인
- `APPS_SCRIPT_URL`이 정확한지 확인
- Google Sheets에 편집 권한이 있는지 확인
- Apps Script 실행 로그 확인 (Apps Script 편집기 > 실행 로그)

### CORS 에러가 발생하는 경우
- JSONP 방식을 사용하므로 CORS 문제 없음
- 그래도 문제 발생 시 Apps Script 재배포

## 📈 데이터 분석

Apps Script에서 제공하는 `createStatisticsSheet()` 함수를 실행하면 자동으로 통계 시트가 생성됩니다:

1. Apps Script 편집기에서 `createStatisticsSheet` 함수 선택
2. **실행** 버튼 클릭
3. Google Sheets에 "Statistics" 시트 생성됨

통계 시트에는 각 항목별로 다음이 표시됩니다:
- 평균
- 최소값
- 최대값
- 표준편차

## 📝 라이선스

MIT License

## 🤝 기여

이슈나 개선 제안은 GitHub Issues를 통해 제출해주세요.

## 📧 문의

문제가 발생하면 다음을 확인해주세요:
1. 브라우저 콘솔 (F12)의 에러 메시지
2. Apps Script 실행 로그
3. GitHub Pages 배포 상태

---

**제작**: 한양대학교 도시공학과 도시설계 및 공간분석 연구실
