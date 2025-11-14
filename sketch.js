// 全域變數
let questionsTable; // 儲存 Q.csv 載入的 Table 物件
let questions = [];  // 儲存格式化後的題目陣列
let currentQ = 0;    // 目前的題目索引
let score = 0;       // 分數
let quizState = 'QUIZ'; // 狀態: 'QUIZ', 'RESULT'
let trail = [];      // 游標拖尾軌跡陣列

// 選項框的設定
let OPTION_W, OPTION_H;
let OPTION_Y_START; // 在 calcLayout 中設定初始值，但在 drawQuizScreen 中動態覆寫
const OPTION_MARGIN_RATIO = 0.03;

// 動畫與重新開始按鈕
let animationTime = 0;
let feedbackMessage = "";
let restartBtn; // 重新開始按鈕物件

// ---------------------------------------------------
// 1. 載入資料
// ---------------------------------------------------
function preload() {
  // ⚠️ 確保你有一個 Q.csv，格式如下：
  // Question,OptionA,OptionB,OptionC,Answer
  questionsTable = loadTable('Q.csv', 'csv', 'header');
}

// ---------------------------------------------------
// 2. 初始化
// ---------------------------------------------------
function setup() {
  // 使用 windowWidth, windowHeight 建立全螢幕畫布
  createCanvas(windowWidth, windowHeight);
  textAlign(CENTER, CENTER);
  rectMode(CENTER);

  // 計算尺寸
  calcLayout();

  // 轉換 CSV -> 陣列
  if (questionsTable && questionsTable.getRowCount() > 0) {
    for (let r = 0; r < questionsTable.getRowCount(); r++) {
      let row = questionsTable.getRow(r);
      questions.push({
        q: row.getString('Question'),
        options: [
          row.getString('OptionA'),
          row.getString('OptionB'),
          row.getString('OptionC')
        ],
        answer: row.getString('Answer').toUpperCase().trim()
      });
    }
  } else {
    console.error("❌ Q.csv 載入失敗或無資料！");
    questions.push({
      q: "範例題：p5.js 是什麼？ (這是一個很長的範例題目，測試文字換行和動態高度調整是否正常運作。)",
      options: ["這是一個選項 A (很長的選項文本)", "一個 JavaScript 函式庫", "一個遊戲"],
      answer: "B"
    });
  }

  // 建立重新開始按鈕（預設隱藏）
  restartBtn = createButton("🔄 重新開始測驗");
  // 按鈕位置將在 drawResultScreen 和 windowResized 中更新
  restartBtn.position(width / 2 - 100, height * 0.85); 
  restartBtn.size(200, 50);
  restartBtn.style("font-size", "18px");
  restartBtn.style("border-radius", "10px");
  restartBtn.style("background-color", "#66a3ff");
  restartBtn.style("color", "white");
  restartBtn.style("border", "none");
  restartBtn.hide();
  restartBtn.mousePressed(restartQuiz);
}

// ---------------------------------------------------
// 3. 視窗大小調整
// ---------------------------------------------------
function windowResized() {
  // 確保視窗改變時，畫布也跟著改變
  resizeCanvas(windowWidth, windowHeight);
  calcLayout();
  // 更新按鈕位置
  restartBtn.position(width / 2 - 100, height * 0.85);
}

// ---------------------------------------------------
// 4. 主繪圖迴圈
// ---------------------------------------------------
function draw() {
  background(240, 240, 255);
  drawCursorTrail();

  if (quizState === 'QUIZ') {
    drawQuizScreen();
    restartBtn.hide();
  } else if (quizState === 'RESULT') {
    drawResultScreen();
    restartBtn.show();
  }
}

// ---------------------------------------------------
// 5. 題目畫面 (動態佈局優化)
// ---------------------------------------------------
function drawQuizScreen() {
  if (currentQ >= questions.length) return;
  let qData = questions[currentQ];
  let optionMargin = height * OPTION_MARGIN_RATIO;
  
  cursor(ARROW); 
  let anyHovering = false; 

  // --- 1. 標題 (固定位置) ---
  fill(50);
  textSize(width * 0.02); 
  text(`問題 ${currentQ + 1} / ${questions.length}:`, width / 2, height * 0.08);

  // --- 2. 題目文本區塊 (動態計算高度) ---
  push();
  fill(50);
  
  // 設定字體參數
  let titleSize = width * 0.03; 
  let titleLeading = width * 0.04; // 行高
  let textWidthLimit = OPTION_W * 0.95; // 限制寬度
  let textYStart = height * 0.15; // 題目開始的 Y 座標
  
  // 確保設定了 textSize 和 textLeading 才能正確測量
  textSize(titleSize);
  textLeading(titleLeading); 
  
  // 估算題目文本所需的高度
  let requiredHeight = calcTextHeight(qData.q, textWidthLimit, titleLeading);
  
  // 繪製題目: y 座標應為文本框的中心
  let textCenterY = textYStart + requiredHeight / 2;
  
  // 使用 text(str, x, y, w, h) 的 w 參數來實現換行
  text(qData.q, width / 2, textCenterY, textWidthLimit, requiredHeight * 1.5);
  pop();

  // --- 3. 動態計算選項起始 Y 座標 ---
  // 選項起始點 = 題目文本框結束點 (textYStart + requiredHeight) + 固定間隔
  const DYNAMIC_OPTION_Y_START = textYStart + requiredHeight + height * 0.05;
  
  // --- 4. 選項區塊 ---
  const optionLabels = ['A', 'B', 'C'];
  let optionSize = width * 0.018; 
  let optionLeading = width * 0.025;
  
  for (let i = 0; i < qData.options.length; i++) {
    let x = width / 2;
    // 使用新的 DYNAMIC_OPTION_Y_START
    let y = DYNAMIC_OPTION_Y_START + i * (OPTION_H + optionMargin);
    let w = OPTION_W;
    let h = OPTION_H;
    
    let isHovering = mouseX > x - w / 2 && mouseX < x + w / 2 &&
                     mouseY > y - h / 2 && mouseY < y + h / 2;

    push();
    if (isHovering) {
      fill(120, 180, 255);
      stroke(50);
      strokeWeight(5);
      anyHovering = true; // 標記為懸停
    } else {
      fill(220, 230, 255);
      stroke(150);
      strokeWeight(2);
    }
    rect(x, y, w, h, 15);
    
    // 選項文字繪製
    fill(0);
    textSize(optionSize);
    textLeading(optionLeading);
    
    // 選項文字自動換行，限制在選項框的 90% 寬度內
    text(`${optionLabels[i]}. ${qData.options[i]}`, x, y, w * 0.9, h * 0.9);
    pop();
  }
  
  if (anyHovering) {
    cursor(HAND);
  }
  
  // --- 5. 分數顯示 (動態調整) ---
  // 分數位置 = 最後一個選項的底部 + 固定間隔
  let scoreY = DYNAMIC_OPTION_Y_START + (qData.options.length - 1) * (OPTION_H + optionMargin) + OPTION_H / 2 + height * 0.05;
  fill(100);
  textSize(width * 0.015);
  text(`目前得分: ${score}`, width / 2, scoreY);
}

// ---------------------------------------------------
// 6. 結果畫面 (動畫與按鈕)
// ---------------------------------------------------
function drawResultScreen() {
  let percentage = (score / questions.length) * 100;

  push();
  textSize(width * 0.045);
  fill(0, 150, 0);
  text("測驗結束！", width / 2, height * 0.15);

  textSize(width * 0.06);
  fill(0, 0, 200);
  text(`總分: ${score} / ${questions.length}`, width / 2, height * 0.28);

  textSize(width * 0.03);
  fill(100);
  text(`正確率: ${percentage.toFixed(1)}%`, width / 2, height * 0.38);

  if (percentage === 100) {
    feedbackMessage = "💯 完美！太棒了！ 💯";
    drawPraiseAnimation();
  } else if (percentage >= 70) {
    feedbackMessage = "🌟 表現優異，繼續保持！ 🌟";
    drawGoodJobAnimation();
  } else {
    feedbackMessage = "💪 繼續努力，下次會更好！ 💪";
    drawEncouragementAnimation();
  }

  textSize(width * 0.035);
  fill(255, 69, 0);
  text(feedbackMessage, width / 2, height * 0.5);
  pop();

  animationTime += 0.05;
}

// ---------------------------------------------------
// 7. 游標拖尾 (不變)
// ---------------------------------------------------
function drawCursorTrail() {
  trail.push(createVector(mouseX, mouseY));
  if (trail.length > 20) trail.shift();

  for (let i = 0; i < trail.length; i++) {
    let p = trail[i];
    let size = map(i, 0, trail.length, 5, 25);
    let alpha = map(i, 0, trail.length, 30, 200);
    noStroke();
    fill(255, 165, 0, alpha);
    circle(p.x, p.y, size);
  }
}

// ---------------------------------------------------
// 8. 動畫 (已移除燈泡圖案)
// ---------------------------------------------------
function drawPraiseAnimation() {
  let starCount = 30;
  let centerX = width / 2;
  let centerY = height * 0.75;
  let pulse = map(sin(animationTime * 2), -1, 1, 100, 255);
  noStroke();
  fill(255, 255, 0, pulse * 0.5);
  circle(centerX, centerY, width * 0.5);

  for (let i = 0; i < starCount; i++) {
    let rotation = i * (TWO_PI / starCount) + animationTime * 0.5;
    let dist = map(sin(animationTime * 3), -1, 1, 100, 200);
    let x = centerX + cos(rotation) * dist * 1.5;
    let y = centerY + sin(rotation) * dist;
    let starSize = 10 + sin(animationTime * 10 + i) * 10;
    drawStar(x, y, starSize * 0.5, starSize, 5);
  }
}

function drawGoodJobAnimation() {
  let centerX = width / 2;
  let centerY = height * 0.75;
  push();
  translate(centerX, centerY);
  let offsetY = sin(animationTime * 8) * 40;
  translate(0, offsetY);

  fill(255, 200, 0);
  stroke(0);
  strokeWeight(2);
  circle(0, 0, width * 0.15);

  fill(0);
  circle(-width * 0.03, -height * 0.02, width * 0.015);
  circle(width * 0.03, -height * 0.02, width * 0.015);
  arc(0, height * 0.02, width * 0.08, height * 0.05, 0, PI);

  textSize(width * 0.02);
  fill(200, 50, 50);
  text("Good Job!", 0, -height * 0.1);
  pop();
}

// 💡 鼓勵動畫 (已移除燈泡，改為向上箭頭)
function drawEncouragementAnimation() {
  let centerX = width / 2;
  let centerY = height * 0.75;
  push();
  translate(centerX, centerY);
  
  // 讓整個圖案向上跳動
  let offsetY = sin(animationTime * 8) * 30;
  translate(0, offsetY);

  // 繪製向上箭頭
  fill(100, 100, 200); // 藍紫色
  stroke(50);
  strokeWeight(3);
  
  // 箭頭主體 (矩形)
  rect(0, height * 0.05, width * 0.04, height * 0.08);

  // 箭頭頭部 (三角形)
  let triangleSize = width * 0.06;
  triangle(
    -triangleSize / 2, -height * 0.02, 
    triangleSize / 2, -height * 0.02, 
    0, -height * 0.08
  );
  
  // 繪製文字
  fill(0);
  textSize(width * 0.025);
  text("需要加油！", 0, height * 0.15); // 將文字向下移動，避免與箭頭重疊
  pop();
}

function drawStar(x, y, radius1, radius2, npoints) {
  let angle = TWO_PI / npoints;
  let halfAngle = angle / 2.0;
  push();
  translate(x, y);
  fill(255, 255, 0);
  stroke(255, 165, 0);
  strokeWeight(2);
  beginShape();
  for (let a = 0; a < TWO_PI; a += angle) {
    let sx = cos(a) * radius2;
    let sy = sin(a) * radius2;
    vertex(sx, sy);
    sx = cos(a + halfAngle) * radius1;
    sy = sin(a + halfAngle) * radius1;
    vertex(sx, sy);
  }
  endShape(CLOSE);
  pop();
}

// ---------------------------------------------------
// 9. 點擊事件 (確保點擊座標使用 DYNAMIC_OPTION_Y_START)
// ---------------------------------------------------
function mousePressed() {
  if (quizState === 'QUIZ') processAnswer();
}

function processAnswer() {
  let qData = questions[currentQ];
  const optionLabels = ['A', 'B', 'C'];
  let optionMargin = height * OPTION_MARGIN_RATIO;

  // 這裡需要再次計算 DYNAMIC_OPTION_Y_START，以確保點擊位置正確
  let titleSize = width * 0.03; 
  let titleLeading = width * 0.04;
  let textWidthLimit = OPTION_W * 0.95;
  let textYStart = height * 0.15;
  // 臨時設定 textSize 和 textLeading 以便 calcTextHeight 正常運作
  textSize(titleSize);
  textLeading(titleLeading); 
  let requiredHeight = calcTextHeight(qData.q, textWidthLimit, titleLeading);
  const DYNAMIC_OPTION_Y_START = textYStart + requiredHeight + height * 0.05;

  for (let i = 0; i < qData.options.length; i++) {
    let x = width / 2;
    let y = DYNAMIC_OPTION_Y_START + i * (OPTION_H + optionMargin);
    let w = OPTION_W;
    let h = OPTION_H;
    let isClicked = mouseX > x - w / 2 && mouseX < x + w / 2 &&
                    mouseY > y - h / 2 && mouseY < y + h / 2;
    if (isClicked) {
      if (optionLabels[i] === qData.answer) score++;
      currentQ++;
      if (currentQ >= questions.length) {
        quizState = 'RESULT';
        animationTime = 0;
      }
      return;
    }
  }
}

// ---------------------------------------------------
// 🔁 重新開始測驗 (不變)
// ---------------------------------------------------
function restartQuiz() {
  score = 0;
  currentQ = 0;
  quizState = 'QUIZ';
  animationTime = 0;
  restartBtn.hide();
}

// ---------------------------------------------------
// 🧭 計算版面比例 (不變)
// ---------------------------------------------------
function calcLayout() {
  OPTION_W = width * 0.75;
  OPTION_H = height * 0.08;
  OPTION_Y_START = height * 0.4; // 預設值，實際被 drawQuizScreen 覆蓋
}


// ---------------------------------------------------
// 10. 輔助函數: 估算文字高度 (重要!)
// ---------------------------------------------------
function calcTextHeight(str, maxW, leading) {
  // str: 要測量的字串
  // maxW: 文本框最大寬度
  // leading: 行高 (textLeading)
  if (!str || str.length === 0) return 0;
  
  let words = str.split(' ');
  let currentLine = '';
  let numLines = 1;
  
  push();
  
  // 模擬 p5.js 的文字自動換行邏輯
  for (let i = 0; i < words.length; i++) {
    let word = words[i];
    let testLine = currentLine + word + ' ';
    
    // 使用 textWidth 測量當前行寬度
    if (textWidth(testLine) > maxW && currentLine.length > 0) {
      numLines++;
      currentLine = word + ' ';
    } else {
      currentLine = testLine;
    }
  }
  pop();
  
  // 總高度 = 行數 * 行高 (leading)
  return numLines * leading;
}