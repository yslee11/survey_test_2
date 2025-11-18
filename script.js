/***** ✅ 사용자가 직접 수정해야 하는 부분 *****/

// GitHub 저장소 정보
const GITHUB = {
  owner: "YOUR_GITHUB_USERNAME",    // ✅ 본인 깃허브 ID
  repo: "YOUR_REPO_NAME",           // ✅ 저장소 이름
  branch: "main",                   // ✅ 브랜치 (보통 main)
  path: "images"                    // ✅ 이미지 폴더 이름
};

// Google Apps Script Web App URL
// ✅ Apps Script 배포 후 여기에 URL을 붙여넣으세요
const APPS_SCRIPT_URL = "YOUR_APPS_SCRIPT_WEB_APP_URL";

// 샘플 이미지 개수 (전체 이미지 중 랜덤으로 선택할 개수)
const SAMPLE_SIZE = 20;

/*****************************************************/

// 전역 변수
let currentImage = 0;
let responses = [];
let participant = { gender: "", age: "" };
let selectedImages = [];
let startTime = null;
const userID = generateUserID();

// 평가 항목 정의
const RATING_CATEGORIES = [
  { name: 'safety', label: '안전성' },
  { name: 'comfort', label: '쾌적성' },
  { name: 'convenience', label: '편리성' },
  { name: 'accessibility', label: '접근성' }
];

/**
 * 고유한 사용자 ID 생성
 */
function generateUserID() {
  return 'user-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

/**
 * 이미지 URL에서 이미지 ID 추출
 */
function getImageID(url) {
  return url.split('/').pop();
}

/**
 * 페이지 전환
 */
function showPage(pageId) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(pageId).classList.add("active");
}

/**
 * GitHub API를 통해 이미지 목록 가져오기
 */
async function getImageList() {
  try {
    const api = `https://api.github.com/repos/${GITHUB.owner}/${GITHUB.repo}/git/trees/${GITHUB.branch}?recursive=1`;
    const res = await fetch(api);
    
    if (!res.ok) {
      throw new Error(`GitHub API 오류: ${res.status}`);
    }
    
    const data = await res.json();
    
    // 이미지 파일만 필터링
    const exts = /\.(jpg|jpeg|png|webp|gif)$/i;
    const images = data.tree
      .filter(item => 
        item.type === "blob" && 
        item.path.startsWith(`${GITHUB.path}/`) && 
        exts.test(item.path)
      )
      .map(item => 
        `https://raw.githubusercontent.com/${GITHUB.owner}/${GITHUB.repo}/${GITHUB.branch}/${item.path}`
      );
    
    console.log(`총 ${images.length}개의 이미지를 찾았습니다.`);
    return images;
    
  } catch (error) {
    console.error("이미지 목록 로딩 실패:", error);
    alert("❌ 이미지 목록을 불러오는데 실패했습니다.\n\nGitHub 설정을 확인해주세요:\n- 저장소가 Public인지 확인\n- GITHUB 정보가 정확한지 확인");
    throw error;
  }
}

/**
 * 설문 초기화
 */
async function initSurvey() {
  try {
    startTime = new Date();
    const allImages = await getImageList();
    
    // 이미지가 없으면 에러
    if (allImages.length === 0) {
      throw new Error("이미지가 없습니다.");
    }
    
    // 랜덤 샘플링
    const sampleCount = Math.min(SAMPLE_SIZE, allImages.length);
    selectedImages = allImages
      .sort(() => 0.5 - Math.random())
      .slice(0, sampleCount);
    
    currentImage = 0;
    responses = [];
    
    console.log(`${selectedImages.length}개 이미지로 설문 시작`);
    await loadImage();
    
  } catch (error) {
    console.error("설문 초기화 실패:", error);
    alert("설문을 시작할 수 없습니다. 페이지를 새로고침 후 다시 시도해주세요.");
  }
}

/**
 * 이미지 로딩
 */
function loadImage() {
  return new Promise((resolve, reject) => {
    const img = document.getElementById("survey-image");
    const loadingEl = document.getElementById("loading");
    
    // 로딩 표시
    loadingEl.style.display = "block";
    img.style.display = "none";
    
    // 이미지 로드 완료
    img.onload = function() {
      loadingEl.style.display = "none";
      img.style.display = "block";
      updateProgress();
      clearAllRatings();
      updateButtonStates();
      resolve();
    };
    
    // 이미지 로드 실패
    img.onerror = function() {
      loadingEl.style.display = "none";
      loadingEl.innerHTML = '<p style="color: red;">❌ 이미지 로딩 실패</p>';
      loadingEl.style.display = "block";
      updateProgress();
      clearAllRatings();
      updateButtonStates();
      reject(new Error("이미지 로딩 실패"));
    };
    
    // 이미지 소스 설정
    img.src = selectedImages[currentImage];
  });
}

/**
 * 진행 상황 업데이트
 */
function updateProgress() {
  const progressFill = document.getElementById("progress-fill");
  const progressText = document.getElementById("progress-text");
  
  const percentage = ((currentImage + 1) / selectedImages.length) * 100;
  progressFill.style.width = percentage + "%";
  progressText.textContent = `${currentImage + 1} / ${selectedImages.length}`;
}

/**
 * 모든 평가 항목 선택 초기화
 */
function clearAllRatings() {
  RATING_CATEGORIES.forEach(category => {
    document.querySelectorAll(`input[name="${category.name}"]`)
      .forEach(radio => radio.checked = false);
  });
}

/**
 * 모든 평가 항목이 선택되었는지 확인
 */
function areAllRatingsSelected() {
  return RATING_CATEGORIES.every(category => {
    const selected = document.querySelector(`input[name="${category.name}"]:checked`);
    return selected !== null;
  });
}

/**
 * 현재 선택된 모든 평가 점수 가져오기
 */
function getAllRatings() {
  const ratings = {};
  
  RATING_CATEGORIES.forEach(category => {
    const selected = document.querySelector(`input[name="${category.name}"]:checked`);
    ratings[category.name] = selected ? parseInt(selected.value) : null;
  });
  
  return ratings;
}

/**
 * 버튼 상태 업데이트
 */
function updateButtonStates() {
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  
  // 이전 버튼 (첫 번째 이미지에서는 비활성화)
  prevBtn.disabled = currentImage === 0;
  
  // 다음 버튼 텍스트 변경 (마지막 이미지에서는 "제출")
  if (currentImage >= selectedImages.length - 1) {
    nextBtn.textContent = "제출 완료 ✓";
  } else {
    nextBtn.textContent = "다음 ▶";
  }
}

/**
 * 다음 질문으로 이동
 */
async function nextQuestion() {
  // 모든 항목이 선택되었는지 확인
  if (!areAllRatingsSelected()) {
    const unanswered = RATING_CATEGORIES
      .filter(cat => !document.querySelector(`input[name="${cat.name}"]:checked`))
      .map(cat => cat.label)
      .join(', ');
    
    alert(`⚠️ 모든 항목을 평가해주세요!\n\n미평가 항목: ${unanswered}`);
    return;
  }

  // 응답 저장
  const ratings = getAllRatings();
  
  responses.push({
    timestamp: new Date().toISOString(),
    userID: userID,
    gender: participant.gender,
    age: participant.age,
    imageID: getImageID(selectedImages[currentImage]),
    imageIndex: currentImage + 1,
    ...ratings
  });

  console.log(`이미지 ${currentImage + 1} 평가 완료:`, ratings);

  // 마지막 이미지인 경우 제출
  if (currentImage >= selectedImages.length - 1) {
    await submitSurvey();
    return;
  }

  // 다음 이미지로 이동
  currentImage++;
  await loadImage();
}

/**
 * 이전 질문으로 이동
 */
async function prevQuestion() {
  if (currentImage > 0) {
    currentImage--;
    
    // 이전 응답 제거
    responses.pop();
    
    await loadImage();
    
    // 이전에 선택했던 값 복원
    if (responses.length > 0) {
      const lastResponse = responses[responses.length - 1];
      RATING_CATEGORIES.forEach(category => {
        const value = lastResponse[category.name];
        if (value) {
          const radio = document.querySelector(`input[name="${category.name}"][value="${value}"]`);
          if (radio) radio.checked = true;
        }
      });
    }
  }
}

/**
 * 설문 제출
 */
async function submitSurvey() {
  try {
    console.log("제출 시작...");
    
    // 제출 데이터 준비
    const submitData = {
      participant: participant,
      userID: userID,
      responses: responses,
      metadata: {
        totalImages: selectedImages.length,
        submittedAt: new Date().toISOString(),
        startTime: startTime.toISOString()
      }
    };

    console.log("제출 데이터:", submitData);

    // JSONP 방식으로 전송
    await sendDataViaJSONP(submitData);
    
    // 완료 페이지로 이동
    showCompletionPage();
    
  } catch (error) {
    console.error("제출 실패:", error);
    alert("❌ 제출 중 오류가 발생했습니다.\n\n" + error.message + "\n\n다시 시도해주세요.");
  }
}

/**
 * JSONP 방식으로 데이터 전송
 */
function sendDataViaJSONP(data) {
  return new Promise((resolve, reject) => {
    // 콜백 함수 이름 생성
    const callbackName = 'jsonpCallback_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
    
    // URL 생성
    const url = `${APPS_SCRIPT_URL}?callback=${callbackName}&data=${encodeURIComponent(JSON.stringify(data))}`;
    
    console.log("JSONP 요청 URL 길이:", url.length);
    
    // URL이 너무 길면 경고
    if (url.length > 8000) {
      console.warn("⚠️ URL이 너무 깁니다. 일부 브라우저에서 문제가 발생할 수 있습니다.");
    }
    
    // 글로벌 콜백 함수 정의
    window[callbackName] = function(result) {
      console.log("서버 응답:", result);
      
      // 타임아웃 정리
      if (timeoutId) clearTimeout(timeoutId);
      
      // script 태그 제거
      if (script && script.parentNode) {
        script.parentNode.removeChild(script);
      }
      
      // 글로벌 함수 정리
      delete window[callbackName];
      
      // 결과 처리
      if (result && result.status === "success") {
        resolve(result);
      } else {
        reject(new Error(result ? result.message : "제출 실패"));
      }
    };

    // script 태그 생성
    const script = document.createElement('script');
    script.src = url;
    
    // 에러 처리
    script.onerror = function() {
      console.error("JSONP 요청 실패");
      
      if (timeoutId) clearTimeout(timeoutId);
      if (script && script.parentNode) {
        script.parentNode.removeChild(script);
      }
      delete window[callbackName];
      
      reject(new Error("네트워크 오류가 발생했습니다."));
    };
    
    // 타임아웃 설정 (30초)
    const timeoutId = setTimeout(() => {
      console.error("제출 타임아웃");
      
      if (script && script.parentNode) {
        script.parentNode.removeChild(script);
      }
      delete window[callbackName];
      
      reject(new Error("제출 시간이 초과되었습니다."));
    }, 30000);
    
    // 요청 실행
    document.head.appendChild(script);
  });
}

/**
 * 완료 페이지 표시
 */
function showCompletionPage() {
  // 경과 시간 계산
  const endTime = new Date();
  const elapsedMinutes = Math.round((endTime - startTime) / 60000);
  
  // 정보 표시
  document.getElementById("total-images").textContent = selectedImages.length;
  document.getElementById("elapsed-time").textContent = elapsedMinutes + "분";
  
  // 완료 페이지로 전환
  showPage("end-page");
}

/**
 * 이벤트 리스너 등록
 */
document.addEventListener("DOMContentLoaded", () => {
  // 시작 버튼
  document.getElementById("startBtn").addEventListener("click", () => {
    const gender = document.querySelector('input[name="gender"]:checked');
    const age = document.getElementById("age").value;
    
    if (!gender || !age) {
      alert("⚠️ 성별과 연령대를 모두 선택해주세요.");
      return;
    }
    
    participant.gender = gender.value;
    participant.age = age;
    
    console.log("참가자 정보:", participant);
    
    showPage("survey-page");
    initSurvey();
  });
  
  // 다음 버튼
  document.getElementById("nextBtn").addEventListener("click", nextQuestion);
  
  // 이전 버튼
  document.getElementById("prevBtn").addEventListener("click", prevQuestion);
  
  // 평가 항목 선택 시 실시간 피드백
  RATING_CATEGORIES.forEach(category => {
    document.querySelectorAll(`input[name="${category.name}"]`).forEach(radio => {
      radio.addEventListener('change', () => {
        // 선택된 섹션 강조
        const section = radio.closest('.rating-section');
        section.style.background = '#e8f4f8';
        
        setTimeout(() => {
          section.style.background = '#f8f9fa';
        }, 300);
      });
    });
  });
});
