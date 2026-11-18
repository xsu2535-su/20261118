let backgroundImage; // 宣告變數：儲存背景圖片
let idleImg; // 宣告變數：儲存靜止時的精靈圖（death.png）
let walkImg; // 宣告變數：儲存跑步（走路）時的精靈圖（walk.png）
let jumpImg; // 宣告變數：儲存跳躍時的精靈圖（jump.png）
let lightningImg; // 宣告變數：儲存特效1（閃電）精靈圖
let explosionImg; // 宣告變數：儲存特效2（爆炸）精靈圖
let thunderSound; // 宣告變數：儲存打雷音效
let soundOK = false; // 記錄 p5.sound 函式庫是否可用（等到 preload 執行時才檢查，不受 script 載入順序影響）

const STOP_FRAMES = 3; // 靜止精靈圖 death.png 的影格數
const RUN_FRAMES = 3; // 跑步精靈圖 walk.png 的影格數
const JUMP_FRAMES = 3; // 跳躍精靈圖 jump.png 的影格數
const RUN_LOOP_START = 1; // 跑步循環從圖片索引 1（第 2 張）開始，先播第 1–3 張，之後重複第 2–3 張
const RUN_LOOP_LENGTH = RUN_FRAMES - RUN_LOOP_START; // 循環段的影格數（第 2–3 張共 2 張）
const RUN_LAST_POS = RUN_FRAMES + RUN_LOOP_LENGTH - 1; // 播放位置的最大值（0,1,2 之後接 3,4，再回到 3）
const FRAME_DURATION = 100; // 每格動畫播放 100 毫秒
const MOVE_SPEED = 6; // 每個 draw 週期移動的像素數（背景與角色共用）
const GROUND_Y = 1; // 地面位置（占畫布高度的比例）：1 代表貼齊畫布底部，想貼在小徑上可改 0.9
const JUMP_HEIGHT = 0.25; // 跳躍高度（占畫布高度的比例），數字越大跳越高

const LIGHTNING_FRAMES = 14; // 特效1（閃電）共有 14 個畫格
const EXPLOSION_FRAMES = 10; // 特效2（爆炸）共有 10 個畫格
const LIGHTNING_TIMES = 3; // 閃電總共播放的次數
const PLAY_MS = 1000; // 每一次特效播放的時間（毫秒），1 秒鐘
const EFFECT_X_RATIO = 0.75; // 特效出現的位置：距離視窗最右邊 1/4 寬處（也就是 3/4 的位置）
const EXPLOSION_H_RATIO = 0.2; // 爆炸在畫面上的顯示高度（占畫布高度的比例）

let tileWidth = 0; // 一張背景的顯示寬度（依原圖寬高比，高度等於畫布高）
let maxCameraX = 0; // 背景鏡頭能移動到的最右位置
let backgroundCameraX = 0; // 鏡頭在「三張背景接成的長圖」上的位置
let displayHeight = 0; // 角色的顯示高度（畫布高的 1/3）
let characterX = 0; // 角色在畫面上的水平中心位置
let direction = 0; // 目前按的方向：1 往右、-1 往左、0 沒按
let facing = 1; // 角色面向：1 朝右、-1 朝左（放開按鍵後仍保持朝向）
let action = "stop"; // 目前動作："stop" 靜止、"run" 跑步
let lastAction = "stop"; // 上一個週期的動作，用來偵測「剛開始跑」
let stopFrame = 0; // 靜止動畫目前的影格
let runFrameCount = 0; // 跑步的「播放位置」（不是圖片索引）
let jumpFrame = 0; // 跳躍動畫目前的影格
let lastFrameTime = 0; // 上次換格的時間（毫秒）
let jumpY = 0; // 目前角色離地的高度（像素），0 代表貼地

let effectOn = false; // 記錄特效（與音效）目前是否正在進行
let lightningStartedAt = 0; // 記錄特效開始播放的時間（毫秒）
let lightningWorldX = 0; // 特效在「背景長圖」上的位置（世界座標），特效會跟著背景一起移動
let lastThunderStrike = -1; // 記錄上一次已經響過的是第幾道閃電，確保一道閃電只響一次

function preload() { // p5.js 預載函式：在 setup 之前載入所有圖片與音效
  backgroundImage = loadImage('bg/0.png'); // 載入背景圖片
  idleImg = loadImage('3/death/death.png'); // 載入靜止動畫精靈圖（總寬 100*54）
  walkImg = loadImage('3/walk/walk.png'); // 載入跑步動畫精靈圖（總寬 103*51）
  jumpImg = loadImage('3/jump/jump.png'); // 載入跳躍動畫精靈圖（總寬 103*53）
  lightningImg = loadImage('effect/1/effect_1.png'); // 載入閃電精靈圖（14 格橫排，總寬 1073*368，向上對齊）
  explosionImg = loadImage('effect/2/effect_2.png'); // 載入爆炸精靈圖（10 格橫排，總寬 2605*168，向下對齊）
  soundOK = (typeof loadSound === 'function'); // 此時才檢查有沒有載入 p5.sound 函式庫，沒載入就略過音效避免整個程式出錯
  console.log(soundOK ? '[音效] 已偵測到 p5.sound' : '[音效] 找不到 p5.sound，請檢查 index.html 的 script'); // 在 Console 顯示偵測結果，方便除錯
  if (soundOK) { // 如果有 p5.sound 函式庫
    thunderSound = loadSound('audio/chrysalyn-clean-dramatic-lightning-crash-547378.mp3'); // 載入打雷音效（約 4 秒）
  } // 音效載入判斷結束
} // preload 結束

function setup() { // p5.js 初始化函式：只會執行一次
  createCanvas(windowWidth, windowHeight); // 建立與瀏覽器視窗同大小的畫布
  noSmooth(); // 關閉圖片平滑處理，讓像素風格的圖片保持清晰
  if (soundOK) { // 如果音效可以使用
    thunderSound.setVolume(0.8); // 把音量設為 80%，避免太大聲
    thunderSound.playMode('restart'); // 每次播放都從頭開始，不會多道聲音疊在一起造成爆音
  } // 音效設定結束
  resetScene(); // 設定開場的背景與角色位置
} // setup 結束

function resetScene() { // 重設場景：鏡頭置中、角色站中央、特效關閉
  updateLayout(); // 先依目前視窗大小計算尺寸
  backgroundCameraX = max(0, (tileWidth * 3 - width) / 2); // 開場時鏡頭放在長圖正中間
  characterX = width / 2; // 角色站在畫面水平中央
  stopEffects(); // 關閉特效與音效
} // resetScene 結束

function updateLayout() { // 依視窗大小計算會用到的尺寸
  tileWidth = (backgroundImage.width / backgroundImage.height) * height; // 背景依原圖寬高比縮放，高度等於畫布高
  maxCameraX = max(0, tileWidth * 3 - width); // 鏡頭最右位置 = 三張背景總寬 減去 視窗寬
  displayHeight = height / 3; // 角色顯示高度為畫布高度的三分之一
} // updateLayout 結束

function windowResized() { // 當瀏覽器視窗大小改變時自動呼叫
  resizeCanvas(windowWidth, windowHeight); // 重新調整畫布大小
  resetScene(); // 視窗尺寸變了，背景與角色回到開場狀態，避免位置錯亂
} // windowResized 結束

function keyPressed() { // 按下任何按鍵時自動呼叫一次
  if (soundOK) userStartAudio(); // 瀏覽器規定要有使用者操作後才能發聲，所以在第一次按鍵時啟動音訊
  if (keyCode === LEFT_ARROW || keyCode === RIGHT_ARROW || keyCode === UP_ARROW || keyCode === DOWN_ARROW) { // 如果按的是方向鍵
    return false; // 阻止瀏覽器的預設行為（例如頁面捲動）
  } // 方向鍵判斷結束
} // keyPressed 結束

function draw() { // p5.js 主迴圈：每秒約執行 60 次
  background(0); // 以黑色清除畫面
  updateLayout(); // 更新尺寸（視窗大小可能改變）
  updateMovement(); // 依按鍵移動背景鏡頭與角色，並判斷是否啟動特效
  drawBackground(); // 畫出三張相接的背景
  updateAnimation(); // 依時間更新動畫影格
  drawCharacter(); // 畫出角色
  drawEffects(); // 畫出閃電與爆炸特效，並處理音效
} // draw 結束

function runDisplayWidth() { // 計算跑步角色在畫面上的顯示寬度
  const fw = floor(walkImg.width / RUN_FRAMES); // 跑步精靈圖的單格寬度（取整數）
  return displayHeight * (fw / walkImg.height); // 依原圖寬高比換算顯示寬度
} // runDisplayWidth 結束

function updateMovement() { // 負責依按鍵移動背景鏡頭與角色
  direction = (keyIsDown(RIGHT_ARROW) ? 1 : 0) - (keyIsDown(LEFT_ARROW) ? 1 : 0); // 按右為 1、按左為 -1，同時按或都沒按為 0
  if (direction !== 0) facing = direction; // 有按方向時，更新角色面向
  const oldCharacterX = characterX; // 記下移動前的角色位置
  const oldCameraX = backgroundCameraX; // 記下移動前的鏡頭位置
  if (direction !== 0) moveWorld(direction); // 有按方向鍵就執行移動
  const moved = (oldCharacterX !== characterX || oldCameraX !== backgroundCameraX); // 角色或背景有改變才算真的在移動
  action = moved ? "run" : "stop"; // 有移動就是跑步，否則靜止（例如已走到邊緣）
  if (backgroundCameraX >= maxCameraX && !effectOn) { // 如果背景已捲到最右端，而且特效還沒啟動
    startEffects(); // 啟動閃電、爆炸與音效
  } // 啟動判斷結束
} // updateMovement 結束

function moveWorld(dir) { // 移動規則：角色在中央時背景捲動，背景到盡頭後角色才自己走
  let remainingMovement = MOVE_SPEED; // 這個週期還可以移動的距離
  const centerX = width / 2; // 畫面水平中央
  const halfW = runDisplayWidth() / 2; // 角色顯示寬度的一半，用來限制角色不跑出視窗
  const toCenter = centerX - characterX; // 角色離中央的距離（正值代表角色在中央左邊）

  if (toCenter * dir > 0) { // 如果角色不在中央，而且按的方向是朝中央走
    const step = min(remainingMovement, abs(toCenter)); // 這次最多走到中央為止
    characterX += dir * step; // 角色先走回中央
    remainingMovement -= step; // 扣掉已經用掉的移動量
  } // 走回中央結束

  if (remainingMovement > 0 && abs(characterX - centerX) < 0.5) { // 如果還有移動量，而且角色在中央
    const limit = dir > 0 ? (maxCameraX - backgroundCameraX) : backgroundCameraX; // 背景在這個方向還能捲動多遠
    const scrollDistance = min(remainingMovement, limit); // 實際捲動距離不能超過背景盡頭
    backgroundCameraX += dir * scrollDistance; // 移動鏡頭（按右鏡頭往右，背景看起來往左）
    remainingMovement -= scrollDistance; // 扣掉背景用掉的移動量
  } // 背景捲動結束

  if (remainingMovement > 0) { // 如果背景到盡頭了，還有剩餘的移動量
    characterX = constrain(characterX + dir * remainingMovement, halfW, width - halfW); // 角色自己往邊緣走，並停在視窗邊緣
  } // 角色移動結束
} // moveWorld 結束

function drawBackground() { // 負責畫背景的函式
  for (let i = 0; i < 3; i++) { // 依序畫左、中、右三張背景
    const x = i * tileWidth - backgroundCameraX; // 這一張背景在畫面上的 x 座標 = 長圖位置 減去 鏡頭位置
    image(backgroundImage, floor(x), 0, ceil(tileWidth) + 1, height); // 取整數座標並多畫 1 像素，避免接縫出現空隙
  } // 迴圈結束
} // drawBackground 結束

function updateAnimation() { // 負責依時間換動畫影格（用 millis，不用每個 draw 都換）
  if (action !== lastAction) { // 如果動作剛改變
    if (action === "run") runFrameCount = 0; // 每次起跑都從第 1 張開始
    lastAction = action; // 記下目前動作
    lastFrameTime = millis(); // 重新計時，讓第 1 張完整播放
  } // 動作改變判斷結束
  if (millis() - lastFrameTime >= FRAME_DURATION) { // 如果距離上次換格已經過了 100 毫秒
    lastFrameTime = millis(); // 記下這次換格的時間
    jumpFrame = (jumpFrame + 1) % JUMP_FRAMES; // 跳躍動畫往下一格，到最後回到 0
    if (action === "stop") { // 如果是靜止
      stopFrame = (stopFrame + 1) % STOP_FRAMES; // 靜止動畫往下一格，到最後回到 0
    } else if (runFrameCount < RUN_LAST_POS) { // 如果是跑步，而且還沒到最後一個播放位置
      runFrameCount += 1; // 播放位置加 1
    } else { // 否則（已到最後一個播放位置）
      runFrameCount = RUN_FRAMES; // 回到循環段的起點（不再回到第 1 張）
    } // 動作判斷結束
  } // 換格判斷結束
} // updateAnimation 結束

function drawCharacter() { // 負責畫角色的函式
  let sheet; // 宣告變數：本次要使用的精靈圖
  let frames; // 宣告變數：這張精靈圖的影格數
  let index; // 宣告變數：要畫的圖片索引

  if (keyIsDown(UP_ARROW)) { // 如果按著上方向鍵
    sheet = jumpImg; // 使用跳躍精靈圖
    frames = JUMP_FRAMES; // 跳躍影格數
    index = jumpFrame; // 目前的跳躍影格
  } else if (action === "run") { // 否則如果正在跑步
    sheet = walkImg; // 使用跑步精靈圖
    frames = RUN_FRAMES; // 跑步影格數
    index = runFrameCount < RUN_FRAMES ? runFrameCount : RUN_LOOP_START + ((runFrameCount - RUN_FRAMES) % RUN_LOOP_LENGTH); // 把播放位置換算成圖片索引（先 0,1,2，之後 1,2 重複）
  } else { // 否則（靜止）
    sheet = idleImg; // 使用靜止精靈圖
    frames = STOP_FRAMES; // 靜止影格數
    index = stopFrame; // 目前的靜止影格
  } // 圖片選擇結束

  const fw = sheet.width / frames; // 計算單一畫格的寬度（總寬除以影格數）
  const sw = floor(fw); // 取整數的畫格寬度，避免切到鄰近畫格
  const sx = floor(index * fw); // 計算此畫格在精靈圖中的起始 x 座標
  const displayWidth = displayHeight * (sw / sheet.height); // 依原圖寬高比計算顯示寬度，避免變形

  const jumpTarget = keyIsDown(UP_ARROW) ? height * JUMP_HEIGHT : 0; // 按著上鍵時目標高度為跳躍高度，放開則回到地面 0
  jumpY = lerp(jumpY, jumpTarget, 0.2); // 平滑地逼近目標高度，讓跳起與落下有緩動效果

  push(); // 儲存目前的繪圖狀態
  translate(characterX, height * GROUND_Y - jumpY); // 把原點移到角色腳底的中心位置
  if (facing === -1) { // 如果角色朝左
    scale(-1, 1); // 水平翻轉整個座標系
  } // 翻轉判斷結束
  image(sheet, -displayWidth / 2, -displayHeight, displayWidth, displayHeight, sx, 0, sw, sheet.height); // 以原點為腳底中心繪製；翻轉後 x 仍用 -寬度/2，角色才不會跑位
  pop(); // 還原繪圖狀態，避免影響其他繪圖
} // drawCharacter 結束

function startEffects() { // 啟動特效與音效
  effectOn = true; // 標記特效進行中
  lightningStartedAt = millis(); // 記下開始時間
  lightningWorldX = backgroundCameraX + width * EFFECT_X_RATIO; // 記下特效在背景長圖上的位置（距右邊 1/4 處），之後會跟著背景移動
  lastThunderStrike = -1; // 重設音效紀錄，讓第一道閃電可以發出聲音
} // startEffects 結束

function stopEffects() { // 停止特效與音效
  effectOn = false; // 標記特效結束
  if (soundOK && thunderSound) thunderSound.stop(); // 如果音效可以使用，就停止打雷音效
} // stopEffects 結束

function explosionDisplayWidth() { // 計算爆炸在畫面上的顯示寬度（比閃電寬，用來判斷是否完全離開畫面）
  const fw = floor(explosionImg.width / EXPLOSION_FRAMES); // 爆炸單格寬度（取整數）
  return height * EXPLOSION_H_RATIO * (fw / explosionImg.height); // 依原圖寬高比換算顯示寬度
} // explosionDisplayWidth 結束

function drawEffects() { // 負責播放特效與音效的函式：閃電 3 次 → 爆炸 1 次，之後不斷重複
  if (!effectOn) return; // 特效沒有啟動就什麼都不做

  const effectX = lightningWorldX - backgroundCameraX; // 特效在畫面上的位置 = 世界座標 減去 鏡頭位置，所以會跟著背景一起移動
  const effectDisplayWidth = explosionDisplayWidth(); // 取得特效的最大顯示寬度
  const effectHasExited = effectX - effectDisplayWidth / 2 > width; // 特效是否已完全離開畫面右側
  if (effectHasExited) { // 如果已經完全離開
    stopEffects(); // 才停止特效與音效
    return; // 結束函式
  } // 離開畫面判斷結束

  const elapsed = millis() - lightningStartedAt; // 特效已經進行的時間（毫秒）
  const cycleElapsed = elapsed % ((LIGHTNING_TIMES + 1) * PLAY_MS); // 在一個循環（3 次閃電 + 1 次爆炸 = 4000 毫秒）中的第幾毫秒

  if (cycleElapsed < LIGHTNING_TIMES * PLAY_MS) { // 如果在前 3000 毫秒，播放閃電
    const strikeNumber = floor(cycleElapsed / PLAY_MS); // 目前是第幾道閃電（0、1、2）
    if (strikeNumber !== lastThunderStrike) { // 如果這一道閃電還沒響過（draw 每秒跑 60 次，靠這個判斷讓每道閃電只響一次）
      if (soundOK) { // 如果音效可以使用
        thunderSound.play(); // 播放一次打雷音效
        console.log('[音效] 播放打雷音效'); // 在 Console 記錄一次，方便確認每道閃電只響一次
      } // 音效播放判斷結束
      lastThunderStrike = strikeNumber; // 記下這一道已經響過了
    } // 音效判斷結束
    const frame = min(LIGHTNING_FRAMES - 1, floor((cycleElapsed % PLAY_MS) / PLAY_MS * LIGHTNING_FRAMES)); // 每 1 秒把 14 個畫格播放完一次
    drawLightning(effectX, frame); // 畫出對應畫格的閃電
  } else { // 否則（第 4 秒）播放爆炸
    const t = cycleElapsed - LIGHTNING_TIMES * PLAY_MS; // 爆炸已經進行的時間
    const frame = min(EXPLOSION_FRAMES - 1, floor(t / PLAY_MS * EXPLOSION_FRAMES)); // 1 秒內把 10 個畫格播放完一次
    drawExplosion(effectX, frame); // 畫出對應畫格的爆炸
  } // 特效選擇結束
} // drawEffects 結束

function drawLightning(x, f) { // 負責畫閃電的函式（由視窗最上方往下）
  const frameW = lightningImg.width / LIGHTNING_FRAMES; // 計算單一畫格的寬度（總寬除以 14）
  const sw = floor(frameW); // 取整數的畫格寬度，避免切到鄰近畫格
  const sx = floor(f * frameW); // 計算此畫格在精靈圖中的起始 x 座標
  const drawH = height; // 閃電高度等於畫布高度，從視窗最上方一路畫到最底端
  const drawW = drawH * (sw / lightningImg.height); // 依原始比例計算顯示寬度
  image(lightningImg, x - drawW / 2, 0, drawW, drawH, sx, 0, sw, lightningImg.height); // 以 x 為中心、貼著視窗頂端繪製閃電（圖片已向上對齊）
} // drawLightning 結束

function drawExplosion(x, f) { // 負責畫爆炸的函式（出現在視窗最底端，也就是閃電落地處）
  const frameW = explosionImg.width / EXPLOSION_FRAMES; // 計算單一畫格的寬度（總寬除以 10）
  const sw = floor(frameW); // 取整數的畫格寬度，避免切到鄰近畫格
  const sx = floor(f * frameW); // 計算此畫格在精靈圖中的起始 x 座標
  const drawH = height * EXPLOSION_H_RATIO; // 爆炸的顯示高度（畫布高的 0.2）
  const drawW = drawH * (sw / explosionImg.height); // 依原始比例計算顯示寬度
  image(explosionImg, x - drawW / 2, height - drawH, drawW, drawH, sx, 0, sw, explosionImg.height); // 以 x 為中心、貼著視窗最底端繪製爆炸（圖片已向下對齊）
} // drawExplosion 結束