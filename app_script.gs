/**
 * ✅ Google Apps Script 웹 앱 배포 방법:
 * 
 * 1. Google Sheets 새 파일 생성
 * 2. 확장 프로그램 > Apps Script 클릭
 * 3. 이 코드를 붙여넣기
 * 4. 배포 > 새 배포 클릭
 * 5. 유형: 웹 앱
 * 6. 실행: 나
 * 7. 액세스 권한: 모든 사용자
 * 8. 배포 후 웹 앱 URL을 script.js의 APPS_SCRIPT_URL에 붙여넣기
 * 9. Google Sheets ID를 아래 SPREADSHEET_ID에 붙여넣기
 */

// ✅ 여기에 본인의 Google Sheets ID를 입력하세요
const SPREADSHEET_ID = "YOUR_SPREADSHEET_ID_HERE";

/**
 * GET 요청 처리 (JSONP)
 */
function doGet(e) {
  try {
    console.log("요청 수신:", JSON.stringify(e.parameter));
    
    // 파라미터 검증
    if (!e || !e.parameter) {
      return createJsonpResponse("callback", {
        status: "error",
        message: "잘못된 요청입니다"
      });
    }

    // 콜백 함수명 확인
    const callback = e.parameter.callback || "callback";

    // 데이터 파라미터 확인
    if (!e.parameter.data) {
      return createJsonpResponse(callback, {
        status: "error", 
        message: "데이터가 없습니다"
      });
    }

    // 데이터 파싱
    let data;
    try {
      data = JSON.parse(decodeURIComponent(e.parameter.data));
      console.log("파싱된 데이터:", JSON.stringify(data));
    } catch (parseError) {
      console.error("데이터 파싱 오류:", parseError);
      return createJsonpResponse(callback, {
        status: "error", 
        message: "데이터 형식이 올바르지 않습니다: " + parseError.message
      });
    }

    // 데이터 유효성 검증
    if (!data.participant || !data.userID || !data.responses || !Array.isArray(data.responses)) {
      return createJsonpResponse(callback, {
        status: "error", 
        message: "필수 데이터가 누락되었습니다"
      });
    }

    if (data.responses.length === 0) {
      return createJsonpResponse(callback, {
        status: "error", 
        message: "응답 데이터가 없습니다"
      });
    }

    // 스프레드시트 저장
    const result = saveToSpreadsheet(data);
    
    return createJsonpResponse(callback, result);
    
  } catch (error) {
    console.error("일반 오류:", error);
    const callback = (e && e.parameter && e.parameter.callback) || "callback";
    return createJsonpResponse(callback, {
      status: "error",
      message: "서버 오류: " + error.message
    });
  }
}

/**
 * 스프레드시트에 데이터 저장
 */
function saveToSpreadsheet(data) {
  try {
    // 스프레드시트 열기
    let ss;
    try {
      ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    } catch (ssError) {
      console.error("스프레드시트 접근 오류:", ssError);
      return {
        status: "error",
        message: "스프레드시트에 접근할 수 없습니다. SPREADSHEET_ID를 확인하세요."
      };
    }

    // 'Responses' 시트 확인 및 생성
    let sheet = ss.getSheetByName("Responses");
    if (!sheet) {
      sheet = createResponsesSheet(ss);
    }

    // 데이터 저장
    const rowsToAdd = [];
    let validResponses = 0;
    
    data.responses.forEach(function(response) {
      // 응답 데이터 유효성 검증
      if (!response.timestamp || !response.imageID) {
        console.warn("잘못된 응답 데이터 건너뜀:", JSON.stringify(response));
        return;
      }
      
      rowsToAdd.push([
        response.timestamp,           // A: 타임스탬프
        data.userID,                  // B: 사용자 ID
        data.participant.gender || '', // C: 성별
        data.participant.age || '',    // D: 연령대
        response.imageID,             // E: 이미지 ID
        response.imageIndex || '',    // F: 이미지 순서
        parseInt(response.safety) || 0,        // G: 안전성
        parseInt(response.comfort) || 0,       // H: 쾌적성
        parseInt(response.convenience) || 0,   // I: 편리성
        parseInt(response.accessibility) || 0  // J: 접근성
      ]);
      
      validResponses++;
    });

    if (rowsToAdd.length === 0) {
      return {
        status: "error", 
        message: "저장할 유효한 응답이 없습니다"
      };
    }

    // 배치로 데이터 추가
    const startRow = sheet.getLastRow() + 1;
    const range = sheet.getRange(startRow, 1, rowsToAdd.length, 10);
    range.setValues(rowsToAdd);

    // 데이터 포맷 적용
    formatDataRows(sheet, startRow, rowsToAdd.length);

    console.log(`사용자 ${data.userID}: ${validResponses}개 응답 저장 완료`);

    return {
      status: "success",
      message: `${validResponses}개의 응답이 저장되었습니다`,
      savedCount: validResponses,
      userID: data.userID,
      timestamp: new Date().toISOString()
    };

  } catch (saveError) {
    console.error("데이터 저장 오류:", saveError);
    return {
      status: "error", 
      message: "데이터 저장 중 오류가 발생했습니다: " + saveError.message
    };
  }
}

/**
 * Responses 시트 생성
 */
function createResponsesSheet(ss) {
  try {
    const sheet = ss.insertSheet("Responses");
    
    // 헤더 행 추가
    const headers = [
      "타임스탬프",
      "사용자 ID",
      "성별",
      "연령대",
      "이미지 ID",
      "이미지 순서",
      "안전성 (1-5)",
      "쾌적성 (1-5)",
      "편리성 (1-5)",
      "접근성 (1-5)"
    ];
    
    sheet.appendRow(headers);
    
    // 헤더 스타일 적용
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#4a86e8");
    headerRange.setFontColor("#ffffff");
    headerRange.setHorizontalAlignment("center");
    headerRange.setVerticalAlignment("middle");
    
    // 열 너비 조정
    sheet.setColumnWidth(1, 180);  // 타임스탬프
    sheet.setColumnWidth(2, 200);  // 사용자 ID
    sheet.setColumnWidth(3, 80);   // 성별
    sheet.setColumnWidth(4, 100);  // 연령대
    sheet.setColumnWidth(5, 200);  // 이미지 ID
    sheet.setColumnWidth(6, 100);  // 이미지 순서
    sheet.setColumnWidth(7, 120);  // 안전성
    sheet.setColumnWidth(8, 120);  // 쾌적성
    sheet.setColumnWidth(9, 120);  // 편리성
    sheet.setColumnWidth(10, 120); // 접근성
    
    // 시트 고정 (헤더 행)
    sheet.setFrozenRows(1);
    
    console.log("새로운 'Responses' 시트가 생성되었습니다.");
    return sheet;
    
  } catch (error) {
    console.error("시트 생성 오류:", error);
    throw error;
  }
}

/**
 * 데이터 행 포맷 적용
 */
function formatDataRows(sheet, startRow, numRows) {
  try {
    // 전체 데이터 범위
    const dataRange = sheet.getRange(startRow, 1, numRows, 10);
    
    // 테두리 추가
    dataRange.setBorder(true, true, true, true, true, true);
    
    // 가운데 정렬
    dataRange.setHorizontalAlignment("center");
    dataRange.setVerticalAlignment("middle");
    
    // 점수 열에 배경색 적용 (조건부)
    for (let i = 0; i < numRows; i++) {
      const row = startRow + i;
      
      // 안전성, 쾌적성, 편리성, 접근성 점수 색상 적용
      for (let col = 7; col <= 10; col++) {
        const cell = sheet.getRange(row, col);
        const value = cell.getValue();
        
        if (value >= 1 && value <= 5) {
          // 점수에 따라 배경색 변경 (1=빨강, 5=초록)
          const colors = ["#ea4335", "#fbbc04", "#fff176", "#93c47d", "#6aa84f"];
          cell.setBackground(colors[value - 1]);
        }
      }
    }
    
  } catch (error) {
    console.error("포맷 적용 오류:", error);
    // 포맷 실패는 치명적이지 않으므로 계속 진행
  }
}

/**
 * JSONP 응답 생성
 */
function createJsonpResponse(callback, data) {
  const callbackName = callback || "callback";
  const responseText = callbackName + '(' + JSON.stringify(data) + ')';
  
  return ContentService
    .createTextOutput(responseText)
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

/**
 * 테스트용 함수
 */
function testDoGet() {
  const testData = {
    participant: { 
      gender: "남", 
      age: "20대" 
    },
    userID: "test-user-12345",
    responses: [
      {
        timestamp: new Date().toISOString(),
        imageID: "test-image-001.jpg",
        imageIndex: 1,
        safety: 4,
        comfort: 3,
        convenience: 5,
        accessibility: 4
      },
      {
        timestamp: new Date().toISOString(),
        imageID: "test-image-002.jpg",
        imageIndex: 2,
        safety: 2,
        comfort: 2,
        convenience: 3,
        accessibility: 3
      }
    ],
    metadata: {
      totalImages: 2,
      submittedAt: new Date().toISOString(),
      startTime: new Date().toISOString()
    }
  };
  
  const mockEvent = {
    parameter: {
      data: encodeURIComponent(JSON.stringify(testData)),
      callback: "testCallback"
    }
  };
  
  const result = doGet(mockEvent);
  Logger.log("테스트 결과: " + result.getContent());
  
  return result;
}

/**
 * 스프레드시트 통계 생성 (선택사항)
 */
function createStatisticsSheet() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let statsSheet = ss.getSheetByName("Statistics");
    
    if (!statsSheet) {
      statsSheet = ss.insertSheet("Statistics");
    }
    
    // 통계 헤더
    statsSheet.clear();
    statsSheet.appendRow(["항목", "평균", "최소값", "최대값", "표준편차"]);
    
    const categories = [
      { name: "안전성", col: "G" },
      { name: "쾌적성", col: "H" },
      { name: "편리성", col: "I" },
      { name: "접근성", col: "J" }
    ];
    
    categories.forEach((cat, index) => {
      const row = index + 2;
      const col = cat.col;
      
      statsSheet.getRange(row, 1).setValue(cat.name);
      statsSheet.getRange(row, 2).setFormula(`=AVERAGE(Responses!${col}:${col})`);
      statsSheet.getRange(row, 3).setFormula(`=MIN(Responses!${col}:${col})`);
      statsSheet.getRange(row, 4).setFormula(`=MAX(Responses!${col}:${col})`);
      statsSheet.getRange(row, 5).setFormula(`=STDEV(Responses!${col}:${col})`);
    });
    
    // 헤더 스타일
    const headerRange = statsSheet.getRange(1, 1, 1, 5);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#4a86e8");
    headerRange.setFontColor("#ffffff");
    
    Logger.log("통계 시트가 생성되었습니다.");
    
  } catch (error) {
    Logger.error("통계 시트 생성 오류:", error);
  }
}
