/***** ✅ 사용자가 직접 수정해야 하는 부분 *****/

// GitHub 저장소 정보
const GITHUB = {
  owner: "yslee11",
  repo: "survey_test_2",
  branch: "main",
  path: "images"
};

// Google Apps Script Web App URL
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwyx8WPaQu2tEmJVvVHMnaLUtN52Si6yLU2bIxbuovzKlcqgIXvHfq_ZnjHfkWQO81y/exec";

// 샘플 이미지 개수
const SAMPLE_SIZE = 20;

/*****************************************************/

// ✅ 중복 제출 방지 플래그 추가
let isSubmitting = false;

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

function generateUserID() {
  return 'user-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

function getImageID(url) {
  return url.split('/').pop();
}

function showPage(pageId) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(pageId).classList.add("active");
  window.scrollTo(0, 0);
}

async function getImageList() {
  try {
    const api = `https://api.github.com/repos/${GITHUB.owner}/${GITHUB.repo}/git/trees/${GITHUB.branch}?recursive=1`;
    const res = await fetch(api);
    
    if (!res.ok) {
      throw new Error(`GitHub API 오류: ${res.status}`);
    }
    
    const data = await res.json();
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
    alert("❌ 이미지 목록을 불러오는데 실패했습니다.\n\nGitHub 설정을 확인해주세요.");
    throw error;
  }
}

async function initSurvey() {
  try {
    startTime = new Date();
    const allImages = await getImageList();
    
    if (allImages.length === 0) {
      throw new Error("이미지가 없습니다.");
    }
    
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

function loadImage() {
  return new Promise((resolve, reject) => {
    const img = document.getElementById("survey-image");
    const loadingEl = document.getElementById("loading");
    
    loadingEl.style.display = "block";
    img.style.display = "none";
    
    img.onload = function() {
      loadingEl.style.display = "none";
      img.style.display = "block";
      updateProgress();
      clearAllRatings();
      updateButtonStates();
      resolve();
    };
    
    img.onerror = function() {
      loadingEl.style.display = "none";
      loadingEl.innerHTML = '<p style="color: red;">❌ 이미지 로딩 실패</p>';
      loadingEl.style.display = "block";
      updateProgress();
      clearAllRatings();
      updateButtonStates();
      reject(new Error("이미지 로딩 실패"));
    };
    
    img.src = selectedImages[currentImage];
  });
}

function updateProgress() {
  const progressFill = document.getElementById("progress-fill");
  const progressText = document.getElementById("progress-text");
  
  const percentage = ((currentImage + 1) / selectedImages.length) * 100;
  progressFill.style.width = percentage + "%";
  progressText.textContent = `${currentImage + 1} / ${selectedImages.length}`;
}

function clearAllRatings() {
  RATING_CATEGORIES.forEach(category => {
    document.querySelectorAll(`input[name="${category.name}"]`)
      .forEach(radio => radio.checked = false);
  });
}

function areAllRatingsSelected() {
  return RATING_CATEGORIES.every(category => {
    const selected = document.querySelector(`input[name="${category.name}"]:checked`);
    return selected !== null;
  });
}

function getAllRatings() {
  const ratings = {};
  RATING_CATEGORIES.forEach(category => {
    const selected = document.querySelector(`input[name="${category.name}"]:checked`);
    ratings[category.name] = selected ? parseInt(selected.value) : null;
  });
  return ratings;
}

function updateButtonStates() {
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  
  prevBtn.disabled = currentImage === 0;
  
  if (currentImage >= selectedImages.length - 1) {
    nextBtn.textContent = "제출 완료 ✓";
  } else {
    nextBtn.textContent = "다음 ▶";
  }
}

async function nextQuestion() {
  // ✅ 제출 중이면 무시
  if (isSubmitting) {
    return;
  }
  
  if (!areAllRatingsSelected()) {
    const unanswered = RATING_CATEGORIES
      .filter(cat => !document.querySelector(`input[name="${cat.name}"]:checked`))
      .map(cat => cat.label)
      .join(', ');
    
    alert(`⚠️ 모든 항목을 평가해주세요!\n\n미평가 항목: ${unanswered}`);
    return;
  }

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

  if (currentImage >= selectedImages.length - 1) {
    await submitSurvey();
    return;
  }

  currentImage++;
  await loadImage();
}

async function prevQuestion() {
  if (currentImage > 0) {
    currentImage--;
    responses.pop();
    await loadImage();
    
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
 * ✅ 제출 중 팝업 표시 함수
 */
function showSubmitModal() {
  // 모달 HTML 생성
  const modal = document.createElement('div');
  modal.id = 'submit-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
  `;
  
  const modalContent = document.createElement('div');
  modalContent.style.cssText = `
    background: white;
    padding: 40px;
    border-radius: 20px;
    text-align: center;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
    max-width: 400px;
  `;
  
  modalContent.innerHTML = `
    <div style="margin-bottom: 20px;">
      <div class="spinner" style="
        width: 50px;
        height: 50px;
        margin: 0 auto 20px;
        border: 4px solid #f3f3f3;
        border-top: 4px solid #667eea;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      "></div>
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
      <h2 style="color: #667eea; font-size: 24px; margin-bottom: 10px;">제출 중...</h2>
      <p style="color: #666; font-size: 16px;">잠시만 기다려주세요</p>
    </div>
  `;
  
  modal.appendChild(modalContent);
  document.body.appendChild(modal);
  
  return modal;
}

/**
 * ✅ 제출 중 팝업 제거 함수
 */
function hideSubmitModal() {
  const modal = document.getElementById('submit-modal');
  if (modal) {
    modal.remove();
  }
}

/**
 * ✅ 개선된 설문 제출 함수
 */
async function submitSurvey() {
  // ✅ 중복 제출 방지
  if (isSubmitting) {
    console.log("이미 제출 중입니다.");
    return;
  }
  
  try {
    isSubmitting = true;
    
    // ✅ 버튼 비활성화
    const nextBtn = document.getElementById("nextBtn");
    const prevBtn = document.getElementById("prevBtn");
    
    nextBtn.disabled = true;
    prevBtn.disabled = true;
    nextBtn.style.opacity = "0.5";
    prevBtn.style.opacity = "0.5";
    
    // ✅ 제출 중 팝업 표시
    const modal = showSubmitModal();
    
    console.log("제출 시작...");
    
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

    // ✅ 타임아웃 10초로 단축
    await sendDataViaJSONP(submitData, 10000);
    
    console.log("✅ 제출 완료!");
    
    // ✅ 팝업 제거
    hideSubmitModal();
    
    // 완료 페이지로 이동
    showCompletionPage();
    
  } catch (error) {
    console.error("제출 실패:", error);
    
    // ✅ 팝업 제거
    hideSubmitModal();
    
    // ✅ 버튼 복원
    const nextBtn = document.getElementById("nextBtn");
    const prevBtn = document.getElementById("prevBtn");
    
    nextBtn.disabled = false;
    prevBtn.disabled = false;
    nextBtn.style.opacity = "1";
    prevBtn.style.opacity = "1";
    
    isSubmitting = false;
    
    alert("❌ 제출 중 오류가 발생했습니다.\n\n" + error.message + "\n\n다시 시도해주세요.");
  }
}

/**
 * ✅ 개선된 JSONP 전송 - 타임아웃 설정 가능
 */
function sendDataViaJSONP(data, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const callbackName = 'jsonpCallback_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
    const url = `${APPS_SCRIPT_URL}?callback=${callbackName}&data=${encodeURIComponent(JSON.stringify(data))}`;
    
    console.log("JSONP 요청 URL 길이:", url.length);
    
    if (url.length > 8000) {
      console.warn("⚠️ URL이 너무 깁니다.");
    }
    
    window[callbackName] = function(result) {
      console.log("서버 응답:", result);
      
      if (timeoutId) clearTimeout(timeoutId);
      
      if (script && script.parentNode) {
        script.parentNode.removeChild(script);
      }
      
      delete window[callbackName];
      
      if (result && result.status === "success") {
        resolve(result);
      } else {
        reject(new Error(result ? result.message : "제출 실패"));
      }
    };

    const script = document.createElement('script');
    script.src = url;
    
    script.onerror = function() {
      console.error("JSONP 요청 실패");
      
      if (timeoutId) clearTimeout(timeoutId);
      if (script && script.parentNode) {
        script.parentNode.removeChild(script);
      }
      delete window[callbackName];
      
      reject(new Error("네트워크 오류가 발생했습니다."));
    };
    
    // ✅ 타임아웃 설정
    const timeoutId = setTimeout(() => {
      console.error("제출 타임아웃");
      
      if (script && script.parentNode) {
        script.parentNode.removeChild(script);
      }
      delete window[callbackName];
      
      reject(new Error("제출 시간이 초과되었습니다."));
    }, timeout);
    
    document.head.appendChild(script);
  });
}

function showCompletionPage() {
  const endTime = new Date();
  const elapsedMinutes = Math.round((endTime - startTime) / 60000);
  
  document.getElementById("total-images").textContent = selectedImages.length;
  document.getElementById("elapsed-time").textContent = elapsedMinutes + "분";
  
  showPage("end-page");
}

/**
 * 이벤트 리스너 등록
 */
document.addEventListener("DOMContentLoaded", () => {
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
  
  // ✅ 디바운싱 추가
  let nextClickTimeout = null;
  document.getElementById("nextBtn").addEventListener("click", () => {
    if (nextClickTimeout) return;
    
    nextClickTimeout = setTimeout(() => {
      nextClickTimeout = null;
    }, 500);
    
    nextQuestion();
  });
  
  document.getElementById("prevBtn").addEventListener("click", prevQuestion);
  
  RATING_CATEGORIES.forEach(category => {
    document.querySelectorAll(`input[name="${category.name}"]`).forEach(radio => {
      radio.addEventListener('change', () => {
        const section = radio.closest('.rating-section');
        section.style.background = '#e8f4f8';
        
        setTimeout(() => {
          section.style.background = '#f8f9fa';
        }, 300);
      });
    });
  });
});
