const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const os = require("os");
const dgram = require("dgram");
const fs = require("fs");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const API_KEY = "###############################";
const RANGE = "List 1!A2:D";
const RANGE_FINALE = "List 1!A2:B200";
const SHEET_ID_STOLY = "190uf1hqx_XY7aJP9Gq8oMvjya3idZRXt-3uOOvZAvnU";
const RANGE_STOLY = "List 1!A2:C";

let finaleOtazky = [];
let finaleIndex = 0;
let lovecIndex = 0;

let currentRychleOtazky = [];

let stolyData = {};

// Zámek pro Arduino: po přijatém stisku ignorovat další po dobu 1s
let lastArduinoPressTime = 0;
const ARDUINO_LOCK_MS = 2000;

let rychleIndex = 0;

let aktualniScenar = "Scénář zatím nebyl načten.";

let stabCounter = 0;

let scenarUvod = "Text pro úvod nebyl načten.";

// Konfigurace všech herních variant
const GAME_PROFILES = {
  nizsi: {
    SHEET_ID: "1D3F6Ix_QrHsDuXR2FViq8p-vF_PynMcrFIkbuJBZWmc",
    SHEET_ID_RYCHLE: "1ZQFzinVXOM5gAN_2CUqcLfoYxWttst_AjGVS6iSHOU4",
    SHEET_ID_FINALE: "1Xzaut2h0vX7_YFAgIf7NfYXibIGGe73ULho2LXS1iGI",
    SHEET_ID_LOVEC: "1przlSSvb7Xo99YnHUG9jOnnhh-d43d1FVbfkpKLd-Co",
    DOC_ID_UVOD: "1m7nDWNZp5WjBkoV28PPPso84Xy839HaGN39jUVxSrSA",
    DOC_ID_KOLO1: "1AgJnW4N1AyFoOWfbAqmoQApL_3q6r5nHjAadZmsA4Ss",
  },
  vyssi: {
    SHEET_ID: "1q7A2TkqjEp5Nyl6eYgquVF1ljA5X3fxfctUHwTXCzxw",
    SHEET_ID_RYCHLE: "1Qo2VUv33rWSxG62kTx11gE_77bR81YBdh4qUFSLxqFg",
    SHEET_ID_FINALE: "1cOSlbKRr5e4do2-PPPVIx_dZI3QbuhfvQpvVYT1n6qM",
    SHEET_ID_LOVEC: "12AIS1QmMtkXhg-XbAzq66SkRvkOka9zGYOng5QZUZxc",
    DOC_ID_UVOD: "1iOYI2bnklw8ZP_7X56YIl_8wWjJDIDyEzvfEz6xPVRg",
    DOC_ID_KOLO1: "1XxmnySkxBhIYe9T6H8iCkAEqWLFlY6E3bmP4E38HSjM",
  },
  ucitele: {
    SHEET_ID: "1-TEIDaNrIHEiBzQhvo9CiIbtyLBp2izWtWCP3nj_xMs",
    SHEET_ID_RYCHLE: "1RRpG-p2V2cESQ8zhIURb-a56RBVACEJUMgCKXQ2knFM",
    SHEET_ID_FINALE: "1KEak0O60qnh9CJg5-VEoAlP9Nxwxf09L1Y4bO8tfJ8w",
    SHEET_ID_LOVEC: "1Ws6ggPiDRKZZ7ONN77gzp8Vb3nULVzdYIiflvztbbbo",
    DOC_ID_UVOD: "1EwUEHbQDyBgCFNbUQQZlrkHCiJNFr714GhHvaV8Rl0g",
    DOC_ID_KOLO1: "1sTWKIRZU2Ku1VVy5-YKjRNihCKwPRUxW_n20A9oVFLo",
  },
};

// Aktuálně zvolený profil (výchozí)
let currentProfile = "nizsi";
let lovecOtazky = [];

if (fs.existsSync("scenar.txt")) {
  aktualniScenar = fs.readFileSync("scenar.txt", "utf8");
  console.log("[Start] Scénář načten z lokálního souboru scenar.txt");
}

// Načtení lokálně uložených dat stolů (pokud existují)
const stolyPath = path.join(__dirname, "data", currentProfile, "stoly.json");
if (fs.existsSync(stolyPath)) {
  try {
    stolyData = JSON.parse(fs.readFileSync(stolyPath, "utf8"));
    console.log("[Start] Data stolů načtena z lokálního souboru.");
  } catch (e) {
    console.error("[Start] Chyba při parsování stoly.json:", e.message);
  }
} else {
  console.log("[Start] Soubor stoly.json nebyl nalezen.");
}

const RANGE_RYCHLE = "List 1!A2:B200";

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}


function initializeNewQuestion() {
  if (!questionsData || questionsData.length === 0) {
    console.log("[GameState] Chyba: Žádné otázky k dispozici!");
    return false;
  }

  questionGameState.currentQuestion =
    questionsData[questionGameState.currentQuestionIndex];
  questionGameState.playerAnswer = null;
  questionGameState.hunterAnswer = null;
  questionGameState.playerAnswerShown = false;
  questionGameState.hunterAnswerShown = false;
  questionGameState.correctAnswerShown = false;
  questionGameState.playerWon = false;
  questionGameState.hunterWon = false;
  questionGameState.ladderMovedPlayer = false;
  questionGameState.ladderMovedHunter = false; // reset movement flags each question

  // Hledá správnou odpověď v aktuální otázce a uloží ji do stavu
  if (
    questionGameState.currentQuestion &&
    questionGameState.currentQuestion.answers
  ) {
    const answers = questionGameState.currentQuestion.answers;
    for (let i = 0; i < answers.length; i++) {
      const answer = answers[i];
      if (answer.isCorrect || answer.correct) {
        questionGameState.correctAnswer = String.fromCharCode(65 + i); // "A", "B", "C"
        break;
      }
    }
  }

  console.log(
    `[GameState] Nová otázka inicializována (index: ${questionGameState.currentQuestionIndex}, správná: ${questionGameState.correctAnswer})`,
  );
  return true;
}

/**
 * Ověří odpověď hráče a rozhodne o posunu
 */
function validatePlayerAnswer(answer) {
  questionGameState.playerAnswer = answer;
  console.log(
    `[GameState-Player] Odpověď hráče: ${answer}, Správně: ${questionGameState.correctAnswer}`,
  );

  if (answer === questionGameState.correctAnswer) {
    questionGameState.playerWon = true;
    console.log("[GameState-Player] ✓ SPRÁVNĚ! Hráč se posune nahoru.");
    // pohyb bude proveden až po kliknutí v controlleru
    return true;
  } else {
    console.log("[GameState-Player] ✗ ŠPATNĚ!");
    return false;
  }
}

/**
 * Ověří odpověď lovce a rozhodne o posunu
 */
function validateHunterAnswer(answer) {
  questionGameState.hunterAnswer = answer;
  console.log(
    `[GameState-Hunter] Odpověď lovce: ${answer}, Správně: ${questionGameState.correctAnswer}`,
  );

  if (answer === questionGameState.correctAnswer) {
    questionGameState.hunterWon = true;
    console.log("[GameState-Hunter] ✓ SPRÁVNĚ! Lovec se posune dolů.");
    // pohyb bude proveden až po kliknutí v controlleru
    return true;
  } else {
    console.log("[GameState-Hunter] ✗ ŠPATNĚ!");
    return false;
  }
}

let questionsData = [];

// flagy pro povolení odpovědí hráče a lovce (aktivní 7s po 'petvterin')
let allowPlayerAnswer = false;
let allowHunterAnswer = false;
let answerTimer = null;

// ========== CENTRALIZOVANÝ GAME STATE - SCENE 5 (DRUHÉ KOLO) ==========
let questionGameState = {
  currentQuestionIndex: 0,
  currentQuestion: null,
  correctAnswer: null,
  playerAnswer: null,
  hunterAnswer: null,
  playerAnswerShown: false,
  hunterAnswerShown: false,
  correctAnswerShown: false,
  playerWon: false,
  hunterWon: false,
  // separate flags so both sides can move once each
  ladderMovedPlayer: false,
  ladderMovedHunter: false,
};

// ========== CENTRALIZOVANÝ GAME STATE - SCENE 6 (FINÁLE) ==========
let finaleGameState = {
  currentHracIndex: 0, // Index otázky hráče
  currentLovecIndex: 0, // Index otázky lovce
  currentHracQuestion: null,
  currentLovecQuestion: null,
  hracAnswered: false,
  lovecAnswered: false,
};

// ladder helper moved to top-level so that validate* functions can call it
function handleZebrikCommand(command) {
  if (command === "changeImage1") {
    if (ladderState.playerLevel > 0) {
      ladderState.playerLevel--;
    }
    console.log(
      `[Žebřík] Hráč se posunul. Hráč: ${ladderState.playerLevel}, Lovec: ${ladderState.hunterLevel}`,
    );
  } else if (command === "changeImage2") {
    ladderState.hunterLevel++;
    console.log(
      `[Žebřík] Lovec se posunul. Hráč: ${ladderState.playerLevel}, Lovec: ${ladderState.hunterLevel}`,
    );
  }

  // 2. KONTROLA: HRÁČ VYHRÁL
  if (!playerHasWon && ladderState.playerLevel <= 0) {
    playerHasWon = true;

    const type = ladderState.selectedType || "middle";
    const finalAmount = ladderAmounts[type] || 0;

    console.log(
      `[VÝHRA] *** HRÁČ VYHRÁL! Částka: ${finalAmount} (typ: ${type}) ***`,
    );

    const total = addToCastka(finalAmount);
    io.emit("playSound", { sound: "playerWin" });

    if (total !== null) {
      currentAmountvyhra = total;
      io.emit("vyhra", { number: total });
      io.emit("playerReached", { amount: total });
    } else {
      io.emit("vyhra", { number: finalAmount });
      io.emit("playerReached", { amount: finalAmount });
    }

    io.emit("hracvyhrazebrik");
  }

  // 3. KONTROLA: LOVEC CHYTIL HRÁČE
  if (
    !playerHasWon &&
    7 - ladderState.hunterLevel + 1 == ladderState.playerLevel &&
    ladderState.hunterLevel > 0
  ) {
    playerHasWon = true;
    console.log(
      `[VÝHRA] *** LOVEC DOBĚHL HRÁČE! hunterLevel: ${ladderState.hunterLevel}, playerLevel: ${ladderState.playerLevel} ***`,
    );
    io.emit("hunterCaughtPlayer", {
      hunterLevel: ladderState.hunterLevel,
      playerLevel: ladderState.playerLevel,
    });
    io.emit("lovecvyhrazebrik");
    io.emit("prohrals");
  }

  if (ladderState.hunterLevel >= LADDER_SEGMENTS) {
    console.log(
      `[VÝHRA] *** LOVEC DOSÁHL VRCHOLU! hunterLevel: ${ladderState.hunterLevel} ***`,
    );
    io.emit("hunterReached");
  }

  // update clients with fresh state
  io.emit("updateZebrikState", ladderState);
  io.emit("ladderState", ladderState); // kept for backwards compatibility
}

const https = require("https");

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (let name in interfaces) {
    for (let iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "127.0.0.1";
}
const currentIp = getLocalIp();

async function downloadDocText(id) {
  return new Promise((resolve) => {
    const url = `https://docs.google.com/document/d/${id}/export?format=txt`;
    console.log(`[Google Docs] Stahování dokumentu: ${id}`);
    console.log(`[Google Docs] URL: ${url}`);

    const request = (targetUrl, depth = 0) => {
      if (depth > 5) {
        console.error(
          `[Google Docs] Chyba: Příliš mnoho přesměrování pro ID ${id}`,
        );
        resolve(null);
        return;
      }

      https
        .get(targetUrl, (res) => {
          //Google házel errory -> přidal jsem logování statusů a přesměrování, aby bylo jasné, co se děje
          if ([301, 302, 307, 308].includes(res.statusCode)) {
            console.log(
              `[Google Docs] Přesměrování (${res.statusCode}) na: ${res.headers.location}`,
            );
            return request(res.headers.location, depth + 1); // Zkusíme to znovu na nové adrese
          }

          if (res.statusCode !== 200) {
            console.error(
              `[Google Docs] Chyba: Status ${res.statusCode} pro ID ${id}`,
            );
            resolve(null);
            return;
          }

          let data = "";
          let chunks = 0;
          res.on("data", (chunk) => {
            data += chunk;
            chunks++;
          });
          res.on("end", () => {
            if (data && data.length > 0) {
              console.log(
                `[Google Docs] ✓ Úspěšně staženo ID: ${id} (${data.length} znaků, ${chunks} chunks)`,
              );
              resolve(data);
            } else {
              console.error(
                `[Google Docs] Chyba: Stažený soubor je prázdný pro ID ${id}`,
              );
              resolve(null);
            }
          });
        })
        .on("error", (e) => {
          console.error(`[Google Docs] Chyba sítě pro ${id}: ${e.message}`);
          resolve(null);
        });
    };

    request(url);
  });
}

// --- UDP DISCOVERY (Aby Arduino samo našlo server) ---
const udpServer = dgram.createSocket("udp4");
udpServer.on("message", (msg, rinfo) => {
  if (msg.toString() === "KDE_JE_SERVER") {
    console.log(
      `[Discovery] Arduino nalezeno na ${rinfo.address}, posílám IP: ${currentIp}`,
    );
    const response = Buffer.from("TADY_JE_SERVER");
    udpServer.send(response, rinfo.port, rinfo.address);
  }
});
udpServer.bind(41234);

app.use(express.static("public"));

async function fetchGenericSheets(id, range) {
  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${range}?key=${API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    return data.values || [];
  } catch (e) {
    return null;
  }
}

// Funkce pro stažení a zpracování dat stolů z Google Sheets
async function fetchAndProcessStolyData() {
  try {
    console.log("[Stoly] Stahuji data stolů z Google Sheets...");
    const rows = await fetchGenericSheets(SHEET_ID_STOLY, RANGE_STOLY);
    if (!rows || rows.length === 0) {
      console.error("[Stoly] Žádná data!");
      return {};
    }

    const result = {};
    rows.forEach((row) => {
      const profil = row[0] ? row[0].trim().toLowerCase() : "";
      const id = row[1] ? parseInt(row[1]) : null;
      const jmeno = row[2] ? row[2].trim() : "";

      if (profil && id && jmeno) {
        if (!result[profil]) result[profil] = [];
        result[profil].push({ id, jmeno });
      }
    });

    console.log("[Stoly] Data zpracována:", result);
    return result;
  } catch (e) {
    console.error("[Stoly] Chyba:", e.message);
    return {};
  }
}

// --- PŘIDÁNO PRO ARDUINO (Nemění nic stávajícího) ---
app.get("/arduino", (req, res) => {
  const prikaz = req.query.prikaz;
  const hodnota = req.query.hodnota ? req.query.hodnota.trim() : "";

  if (prikaz === "tlacitko") {
    // Musíme být ve scéně 6, jinak ignorujeme stisk arduina
    if (currentPreset !== "scene6") {
      console.log(
        `[Arduino] Ignorován stisk ze stolu ${hodnota} (nejsme ve scéně 6, ale v ${currentPreset})`,
      );
      return res.send("BLOCKED"); // Server odpoví Arduinu, že teď to nejde
    }

    //ochrana spamu + zajištění že se přihlásí vždy jen první stůl, který se ozve
    const now = Date.now();
    if (now - lastArduinoPressTime < ARDUINO_LOCK_MS) {
      console.log(
        `[Arduino] Ignorován stisk ze stolu ${hodnota} (blokováno, ${now - lastArduinoPressTime}ms od posledního)`,
      );
      return res.send("BLOCKED");
    }

    // Přijato — zaznamenání času a oznámení všem klientům
    lastArduinoPressTime = now;
    console.log(`>>> AKCE: Stůl ${hodnota} se přihlásil (Scéna 6 aktivní)`);
    io.emit(`stisknutoHrac${hodnota}`, { timestamp: now });
    return res.send("OK");
  }

  res.status(400).send("Chyba parametru");
});
// ----------------------------------------------------

let sceneMappings = {
  debug: {
    index1: "debug.html?index=1",
    index2: "debug.html?index=2",
    index3: "debug.html?index=3",
    index4: "debug.html?index=4",
    index5: "debug.html?index=5",
  },
  scene1: {
    index1: "videolov.html",
    index2: "pozadim.html",
    index3: "pozadi_barvy.html",
    index4: "pozadim.html",
    index5: "pozadic.html",
  },
  scene2: {
    index1: "videolov.html",
    index2: "pozadim.html",
    index3: "castka.html",
    index4: "pozadim.html",
    index5: "pozadic.html",
  },
  scene3: {
    index1: "kameracastka.html",
    index2: "casovac1m.html",
    index3: "castka.html",
    index4: "pozadim.html",
    index5: "pozadic.html",
  },
  scene4: {
    index1: "videolov.html",
    index2: "zebrik.html",
    index3: "castka.html",
    index4: "pozadim.html",
    index5: "pozadic.html",
  },
  scene5: {
    index1: "otazky.html",
    index2: "zebrik.html",
    index3: "castka.html",
    index4: "hrac.html",
    index5: "lovec.html",
  },
  scene6: {
    index1: "finale.html",
    index2: "casovac.html",
    index3: "castka.html",
    index4: "pozadim.html",
    index5: "pozadic.html",
  },
};

let currentPreset = "scene1";
let currentAmount = 0;
let currentAmountvyhra = 0;
let currentQuestionIndex = 0;
const totalQuestions = 110;
let timeLeft = 120;

// Server-side ladder state
let ladderState = { playerLevel: 5, hunterLevel: 0 };
const LADDER_SEGMENTS = 7; //počet "schodů"
let ladderAmounts = { lower: 0, middle: 0, higher: 0 };
let selectedAmountType = null; // 'lower' | 'middle' | 'higher'
let playerHasWon = false;

let finaleState = {
  playerScore: 1,
  hunterScore: 0,
};

function addToCastka(amount) {
  try {
    const castkaPath = path.join(__dirname, "castka");
    let current = 0;
    if (fs.existsSync(castkaPath)) {
      const raw = fs.readFileSync(castkaPath, "utf8");
      current = Number(raw) || 0;
    }
    const next = current + Number(amount || 0);
    fs.writeFileSync(castkaPath, String(next), "utf8");
    console.log(`[Castka] Updated: ${current} + ${amount} = ${next}`);
    return next;
  } catch (e) {
    console.error("[Castka] Error updating castka:", e.message);
    return null;
  }
}

io.on("connection", (socket) => {
  console.log("Uživatel připojen");

  socket.emit("sceneUpdate", sceneMappings[currentPreset]);
  socket.emit("numberInput", { number: currentAmount });
  socket.emit("initQuestionIndex", currentQuestionIndex);
  socket.emit("updateTimer", { timeLeft });
  socket.emit("scenarUpdate", aktualniScenar);
  socket.emit("profileUpdate", currentProfile);
  socket.emit("stolyDataUpdate", stolyData);

  try {
    const castkaPath = path.join(__dirname, "castka");
    if (fs.existsSync(castkaPath)) {
      const raw = fs.readFileSync(castkaPath, "utf8");
      const total = Number(raw) || 0;
      socket.emit("vyhra", { number: total });
    }
  } catch (e) {
    console.error("[Castka] Error reading castka for new client:", e.message);
  }

  socket.on("posunIndexLovec", () => {
    lovecIndex++;
    io.emit("lovecIndexUpdate", lovecIndex);
  });

  // --- LOGIKA NAČÍTÁNÍ Z GOOGLE ---
  // Funkce pro uložení dat do souboru (vytvoří složky, pokud neexistují)
  function saveLocalData(profil, filename, data) {
    try {
      const dir = path.join(__dirname, "data", profil);

      // Vytvoření adresáře
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`[Save] Vytvořen adresář: ${dir}`);
      }

      const filePath = path.join(dir, filename);

      if (typeof data === "string") {
        fs.writeFileSync(filePath, data, "utf8");
        console.log(
          `[Save] ✓ Soubor uložen: ${filePath} (${data.length} bajtů)`,
        );
      } else {
        const jsonData = JSON.stringify(data, null, 2);
        fs.writeFileSync(filePath, jsonData);
        console.log(
          `[Save] ✓ JSON uložen: ${filePath} (${jsonData.length} bajtů)`,
        );
      }

      // Ověření, že se soubor skutečně uložil
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        console.log(
          `[Save] ✓ Ověření OK: ${filename} existuje (velikost: ${stats.size} bajtů)`,
        );
      } else {
        console.error(`[Save] ✗ CHYBA: Soubor ${filename} se neuložil!`);
      }
    } catch (err) {
      console.error(`[Save] ✗ Chyba při ukládání ${filename}:`, err.message);
    }
  }

  // HLAVNÍ SYNC TLAČÍTKO - Stáhne VŠE z internetu do PC
  socket.on("syncVsechnoZGoogle", async () => {
    console.log("\n[Sync] START: Hromadné stahování všech profilů...");

    for (const [key, IDs] of Object.entries(GAME_PROFILES)) {
      console.log(`--- Profil: ${key.toUpperCase()} ---`);

      // 1. ABC Otázky
      const rowsABC = await fetchGenericSheets(IDs.SHEET_ID, RANGE);
      if (rowsABC && rowsABC.length > 0) {
        const formatted = rowsABC.map((row) => {
          let answers = [
            { text: row[1], isCorrect: true },
            { text: row[2], isCorrect: false },
            { text: row[3], isCorrect: false },
          ];
          shuffle(answers);
          return { question: row[0], answers: answers };
        });
        saveLocalData(key, "otazky.json", formatted);
        console.log(`   [OK] ABC Otázky: Staženo ${formatted.length} řádků.`);
      } else {
        console.error(
          `   [CHYBA] ABC Otázky pro profil ${key} se nepodařilo stáhnout (prázdné nebo chyba).`,
        );
      }

      // 2. Rychlé otázky
      const r = await fetchGenericSheets(IDs.SHEET_ID_RYCHLE, RANGE_RYCHLE);
      if (r && r.length > 0) {
        saveLocalData(key, "rychle.json", r);
        console.log(`   [OK] Rychlé otázky: Staženo ${r.length} položek.`);
      } else {
        console.error(`   [CHYBA] Rychlé otázky pro profil ${key} chybí.`);
      }

      // 3. Finále - Hráči
      const f = await fetchGenericSheets(IDs.SHEET_ID_FINALE, RANGE_FINALE);
      if (f && f.length > 0) {
        saveLocalData(key, "finale_hraci.json", f);
        console.log(`   [OK] Finále (Hráči): Staženo ${f.length} položek.`);
      } else {
        console.error(`   [CHYBA] Finále (Hráči) pro profil ${key} chybí.`);
      }

      // 4. Finále - Lovec
      const l = await fetchGenericSheets(IDs.SHEET_ID_LOVEC, RANGE_FINALE);
      if (l && l.length > 0) {
        saveLocalData(key, "finale_lovec.json", l);
        console.log(`   [OK] Finále (Lovec): Staženo ${l.length} položek.`);
      } else {
        console.error(`   [CHYBA] Finále (Lovec) pro profil ${key} chybí.`);
      }

      // 5. Scénáře (Google Docs)
      console.log(`   Stahování Google Docs pro profil ${key}...`);
      const uvod = await downloadDocText(IDs.DOC_ID_UVOD);
      if (uvod && uvod.length > 0) {
        saveLocalData(key, "uvod.txt", uvod);
        console.log(
          `   [OK] Úvodní text stažen a uložen (${uvod.length} znaků).`,
        );
      } else {
        console.error(
          `   [CHYBA] Úvodní text pro profil ${key} se nepodařilo stáhnout (vráceno: ${uvod}).`,
        );
      }

      const scenar = await downloadDocText(IDs.DOC_ID_KOLO1);
      if (scenar && scenar.length > 0) {
        saveLocalData(key, "scenar.txt", scenar);
        console.log(
          `   [OK] Scénář 1. kola stažen a uložen (${scenar.length} znaků).`,
        );
      } else {
        console.error(
          `   [CHYBA] Scénář 1. kola pro profil ${key} se nepodařilo stáhnout (vráceno: ${scenar}).`,
        );
      }
    }

    // Stáhni data stolů (jsou sdílená pro všechny profily)
    console.log("\n--- Stahování dat STOLŮ (sdílená tabulka) ---");
    const stolData = await fetchAndProcessStolyData();
    if (Object.keys(stolData).length > 0) {
      // Ulož data stolu do každého profilu
      for (const profil of Object.keys(GAME_PROFILES)) {
        saveLocalData(profil, "stoly.json", stolData);
      }
      stolyData = stolData;
      console.log("[OK] Data stolů stažena a uložena pro všechny profily.");
    } else {
      console.error("[CHYBA] Data stolů se nepodařilo stáhnout!");
    }

    console.log(
      "\n[Sync] HOTOVO! Všechna data jsou uložena v lokální složce /data/.",
    );

    const dataDir = path.join(__dirname, "data", currentProfile);
    try {
      questionsData = JSON.parse(
        fs.readFileSync(path.join(dataDir, "otazky.json")),
      );
      currentRychleOtazky = JSON.parse(
        fs.readFileSync(path.join(dataDir, "rychle.json")),
      );
      finaleOtazky = JSON.parse(
        fs.readFileSync(path.join(dataDir, "finale_hraci.json")),
      );
      lovecOtazky = JSON.parse(
        fs.readFileSync(path.join(dataDir, "finale_lovec.json")),
      );
      scenarUvod = fs.readFileSync(path.join(dataDir, "uvod.txt"), "utf8");
      aktualniScenar = fs.readFileSync(
        path.join(dataDir, "scenar.txt"),
        "utf8",
      );

      questionGameState.currentQuestionIndex = 0;
      currentQuestionIndex = 0;
      initializeNewQuestion();

      io.emit("otazkyNacteny", questionsData);
      io.emit("rychleOtazkyUpdate", { otazky: currentRychleOtazky, index: 0 });
      io.emit("finaleOtazkyUpdate", { otazky: finaleOtazky, index: 0 });
      io.emit("lovecOtazkyUpdate", { otazky: lovecOtazky, index: 0 });
      io.emit("scenarUvodUpdate", scenarUvod);
      io.emit("scenarUpdate", aktualniScenar);
      io.emit("stolyDataUpdate", stolyData);

      console.log("[Sync] Data načtena a odeslaná všem klientům.");
    } catch (e) {
      console.error("[Sync] Chyba při načítání dat:", e.message);
    }

    io.emit("syncHotovo");
  });

  socket.on("resetZebriku", () => {
    ladderState.playerLevel = 5;
    ladderState.hunterLevel = 0;
    ladderState.selectedType = null;
    playerHasWon = false;

    ladderAmounts.middle = currentAmount;

    console.log(
      `>>> SERVER EVENT: Žebřík načten. Základní (nahraná) částka: ${ladderAmounts.middle} <<<`,
    );

    io.emit("updateZebrikState", ladderState);
    io.emit("ladderState", ladderState);

    io.emit("numberInput", { number: currentAmount });
  });

  // Odeslání do moderátora
  socket.emit("rychleOtazkyUpdate", {
    otazky: currentRychleOtazky,
    index: rychleIndex,
  });

  socket.on("posunIndexRychle", () => {
    rychleIndex++;
    console.log(`[Stav] Index posunut na: ${rychleIndex}`);
    // Synchronizujeme ostatní (kdyby bylo víc moderátorů)
    io.emit("rychleIndexUpdate", rychleIndex);
  });

  socket.on("posunIndexFinale", () => {
    finaleIndex++;
    io.emit("finaleIndexUpdate", finaleIndex);
  });

  socket.on("resetujRychleOtazky", () => {
    console.log("[Stav] Rychlé otázky 1. kola resetovány.");
    rychleIndex = 0;
    io.emit("rychleIndexUpdate", rychleIndex); // Toto zajistí okamžité překreslení u moderátora/štábu
  });

  socket.on("resetujFinale", () => {
    finaleIndex = 0;
    lovecIndex = 0;
    io.emit("finaleIndexUpdate", finaleIndex);
    io.emit("lovecIndexUpdate", lovecIndex);
    console.log("[Stav] Finále i Lovec indexy resetovány.");
  });

  socket.on("nastavProfilOffline", (profil) => {
    if (!GAME_PROFILES[profil]) return;
    currentProfile = profil;
    const dataDir = path.join(__dirname, "data", profil);

    try {
      // Načtení z disku
      questionsData = JSON.parse(
        fs.readFileSync(path.join(dataDir, "otazky.json")),
      );
      currentRychleOtazky = JSON.parse(
        fs.readFileSync(path.join(dataDir, "rychle.json")),
      );
      finaleOtazky = JSON.parse(
        fs.readFileSync(path.join(dataDir, "finale_hraci.json")),
      );
      lovecOtazky = JSON.parse(
        fs.readFileSync(path.join(dataDir, "finale_lovec.json")),
      );
      scenarUvod = fs.readFileSync(path.join(dataDir, "uvod.txt"), "utf8");
      aktualniScenar = fs.readFileSync(
        path.join(dataDir, "scenar.txt"),
        "utf8",
      );

      const lovecPath = path.join(
        __dirname,
        "data",
        profil,
        "finale_lovec.json",
      );
      if (fs.existsSync(lovecPath)) {
        lovecOtazky = JSON.parse(fs.readFileSync(lovecPath));
        io.emit("lovecOtazkyUpdate", {
          otazky: lovecOtazky,
          index: lovecIndex,
        });
      }

      const stolyPath = path.join(__dirname, "data", profil, "stoly.json");
      if (fs.existsSync(stolyPath)) {
        stolyData = JSON.parse(fs.readFileSync(stolyPath));
        console.log("[Offline] Data stolů načtena z disku.");
      }

      currentQuestionIndex = 0;
      rychleIndex = 0;     // Nulování 1. kola
      finaleIndex = 0;     // Nulování finále (hráč)
      lovecIndex = 0;      // Nulování finále (lovec)

      questionGameState.currentQuestionIndex = currentQuestionIndex;
      initializeNewQuestion();

      // Rozeslání do všech tabletů/televizí
      io.emit("otazkyNacteny", questionsData);
      io.emit("rychleOtazkyUpdate", { otazky: currentRychleOtazky, index: 0 }); // Reset indexu při změně profilu
      io.emit("finaleOtazkyUpdate", { otazky: finaleOtazky, index: 0 }); // Reset indexu
      io.emit("lovecOtazkyUpdate", { otazky: lovecOtazky, index: 0 }); // Reset indexu
      io.emit("scenarUvodUpdate", scenarUvod);
      io.emit("scenarUpdate", aktualniScenar);
      io.emit("stolyDataUpdate", stolyData);
      io.emit("dalsiOtazka", currentQuestionIndex);
      io.emit("profileUpdate", profil);

      console.log(`[Offline] Profil ${profil} aktivován z lokální paměti.`);
    } catch (err) {
      console.error(
        `[Offline] Chyba při načítání profilu ${profil}:`,
        err.message,
      );
    }
  });

  // Přeposílání stavů ze žebříku všem ostatním
  socket.on("lovecvyhrazebrik", () => {
    io.emit("lovecvyhrazebrik");
    console.log("Event: Lovec vyhrál žebřík");
  });

  socket.on("hracvyhrazebrik", () => {
    io.emit("hracvyhrazebrik");
    console.log("Event: Hráč vyhrál žebřík");
  });

  // Server naslouchá na žádost od štábu
  socket.on("dejMiScenar", () => {
    console.log("[Štáb] Žádost o zaslání aktuálního scénáře.");
    socket.emit("scenarUpdate", aktualniScenar);
  });

  socket.on("dejMiFinaleOtazky", () => {
    socket.emit("finaleOtazkyUpdate", {
      otazky: finaleOtazky,
      index: finaleIndex,
    });
    socket.emit("lovecOtazkyUpdate", {
      otazky: lovecOtazky,
      index: lovecIndex,
    });
  });

  // Komunikace Štáb -> Moderátor
  socket.on("posliPalec", (data) => {
    // data: { typ: 'up' | 'down' | 'clear' | 'text', zprava: '...' }
    io.emit("ukazPalecModeratorovi", data);
  });

//-----------------------------------------------------
  socket.on("nactiLokalniOtazky", () => {
    try {
      let dataChanged = false;

      // 1. ABC otázky - načti jen pokud nejsou v paměti
      if (!questionsData || questionsData.length === 0) {
        if (fs.existsSync("otazky.json")) {
          const data = fs.readFileSync("otazky.json", "utf8");
          questionsData = JSON.parse(data);
          dataChanged = true;
        }
      }
      socket.emit("otazkyNacteny", questionsData);

      if (!currentRychleOtazky || currentRychleOtazky.length === 0) {
        if (fs.existsSync("rychle_otazky.json")) {
          const dataRychle = fs.readFileSync("rychle_otazky.json", "utf8");
          currentRychleOtazky = JSON.parse(dataRychle);
          dataChanged = true;
        }
      }
      socket.emit("rychleOtazkyUpdate", {
        otazky: currentRychleOtazky,
        index: rychleIndex,
      });


      if (!finaleOtazky || finaleOtazky.length === 0) {
        if (fs.existsSync("finale_otazky.json")) {
          const dataFinale = fs.readFileSync("finale_otazky.json", "utf8");
          finaleOtazky = JSON.parse(dataFinale);
          dataChanged = true;
        }
      }

      socket.emit("finaleOtazkyUpdate", {
        otazky: finaleOtazky,
        index: finaleIndex,
      });


      if (!scenarUvod || scenarUvod === "Text pro úvod nebyl načten.") {
        if (fs.existsSync("scenar_uvod.txt")) {
          scenarUvod = fs.readFileSync("scenar_uvod.txt", "utf8");
          dataChanged = true;
        }
      }

      socket.emit("scenarUvodUpdate", scenarUvod);

      console.log(
        `[Lokal] Data ověřena${dataChanged ? " a naloadována" : " (už byla v paměti)"}.`,
      );
    } catch (err) {
      console.error("[Lokal] Chyba při čtení:", err.message);
    }
  });


  socket.on("changeScene", (data) => {
    if (data && data.preset && sceneMappings[data.preset]) {
      currentPreset = data.preset;

        //logika po posun otázky
      if (currentPreset === "scene5") {
        if (currentQuestionIndex < totalQuestions - 1) {
          currentQuestionIndex++;
        } else {
          currentQuestionIndex = 0; // Reset na začátek, pokud dojdou otázky
        }

        // Inicializuj stav nové otázky na serveru
        questionGameState.currentQuestionIndex = currentQuestionIndex;
        initializeNewQuestion();

        console.log(
          `[Auto-Index] Detekována scéna 5, posouvám otázku na: ${currentQuestionIndex}`,
        );
      }


      if (currentPreset === "scene6") {
        finaleGameState.currentHracIndex = finaleIndex;
        finaleGameState.currentLovecIndex = lovecIndex;
        finaleGameState.hracAnswered = false;
        finaleGameState.lovecAnswered = false;
        console.log(
          `[Scene6] Finále inicializováno (hráč: ${finaleIndex}, lovec: ${lovecIndex})`,
        );
      }

      io.emit("sceneUpdate", sceneMappings[currentPreset]);


      io.emit("otazkyNacteny", questionsData);
      io.emit("dalsiOtazka", currentQuestionIndex);


      if (currentPreset === "scene6") {
        io.emit("finaleOtazkyUpdate", {
          otazky: finaleOtazky,
          index: finaleIndex,
        });
        io.emit("lovecOtazkyUpdate", {
          otazky: lovecOtazky,
          index: lovecIndex,
        });
      }

      console.log(
        `[Sync] Scéna: ${currentPreset}, Index: ${currentQuestionIndex}`,
      );
    }
  });

  socket.on("dalsiOtazka", () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      currentQuestionIndex++;
    } else {
      currentQuestionIndex = 0;
    }

    // Inicializuj novou otázku
    questionGameState.currentQuestionIndex = currentQuestionIndex;
    initializeNewQuestion();

    io.emit("dalsiOtazka", currentQuestionIndex);
    io.emit("syncCorrectAnswer", {
      correctAnswer: questionGameState.correctAnswer,
    });
    console.log(
      "Odeslána zpráva: dalsiOtazka, index:",
      currentQuestionIndex,
      "správná odpověď:",
      questionGameState.correctAnswer,
    );
  });

  socket.on("resetOtazek", () => {
    currentQuestionIndex = 0;
    io.emit("dalsiOtazka", currentQuestionIndex);
    console.log("Resetovány otázky na začátek.");
  });

  socket.on("numberInput", (data) => {
    let receivedNumber = Number(data.number);
    if (!isNaN(receivedNumber)) {

      ladderAmounts.middle = receivedNumber;
      currentAmount += receivedNumber;
      io.emit("numberInput", { number: currentAmount });
      console.log(
        "Aktualizovaná částka:",
        currentAmount,
        "(stored middle:",
        ladderAmounts.middle,
        ")",
      );
      currentAmount = 0;
    } else {
      console.error("Neplatná hodnota:", data.number);
    }
  });

  socket.on("vyhra", (data) => {
    let receivedNumber = Number(data.number);
    if (!isNaN(receivedNumber)) {

      const total = addToCastka(receivedNumber);
      if (total !== null) {
        currentAmountvyhra = total;
        io.emit("vyhra", { number: currentAmountvyhra });
        console.log("Aktualizovaná částka (castka):", currentAmountvyhra);
      } else {

        io.emit("vyhra", { number: receivedNumber });
        console.log("Aktualizovaná částka (fallback):", receivedNumber);
      }
    } else {
      console.error("Neplatná hodnota:", data.number);
    }
  });

  socket.on("higherAmount", (data) => {
    let receivedNumber = Number(data.number);
    if (!isNaN(receivedNumber)) {
      ladderAmounts.higher = receivedNumber;
      io.emit("higherAmount", { number: receivedNumber });
      console.log("Odeslána vyšší částka:", receivedNumber, "(stored higher)");
    } else {
      console.error("Neplatná hodnota pro vyšší částku:", data.number);
    }
  });

  socket.on("lowerAmount", (data) => {
    let receivedNumber = Number(data.number);
    if (!isNaN(receivedNumber)) {
      ladderAmounts.lower = receivedNumber;
      io.emit("lowerAmount", { number: receivedNumber });
      console.log("Odeslána nižší částka:", receivedNumber, "(stored lower)");
    } else {
      console.error("Neplatná hodnota pro nižší částku:", data.number);
    }
  });

  socket.on("prihlasitHrace", (data) => {

    io.emit(`aktivovatHrac${data.hracId}`, data);
    console.log(`Hráč ${data.hracId} (${data.jmeno}) se přihlásil.`);
  });


  socket.on("dejMiRychleOtazky", () => {
    console.log("posílám vyžádané otázky");
    socket.emit("rychleOtazkyUpdate", {
      otazky: currentRychleOtazky,
      index: rychleIndex,
    });
  });

  socket.on("dejMiLovecOtazky", () => {
    console.log(
      "[Sync] Posílám otázky pro lovce moderátorovi. Index:",
      lovecIndex,
    );
    socket.emit("lovecOtazkyUpdate", {
      otazky: lovecOtazky,
      index: lovecIndex,
    });
  });

  socket.on("odstranRychlouOtazku", () => {
    if (currentRychleOtazky.length > 0) {
      currentRychleOtazky.shift();
      console.log(
        `[Stav] Otázka smazána. Zbývá: ${currentRychleOtazky.length}`,
      );

      fs.writeFileSync(
        "rychle_otazky.json",
        JSON.stringify(currentRychleOtazky, null, 2),
      );
    }
  });



  socket.on("dejMiVsechnyOtazky", () => {
    socket.emit("posilamVsechnyOtazky", questionsData);
    socket.emit("syncCorrectAnswer", {
      correctAnswer: questionGameState.correctAnswer,
    });
    console.log("[Sync] Poslal jsem data nově připojenému klientovi.");
  });

  socket.on("dejMiAktualniIndex", () => {
    socket.emit("posilamAktualniIndex", currentQuestionIndex);
    console.log(
      `[Sync] Poslal jsem index (${currentQuestionIndex}) novému klientovi.`,
    );
  });

  // Manuální načtení částky z lokálního souboru
  socket.on("reloadCastka", () => {
    try {
      const castkaPath = path.join(__dirname, "castka");
      let total = 0;
      if (fs.existsSync(castkaPath)) {
        const raw = fs.readFileSync(castkaPath, "utf8");
        total = Number(raw) || 0;
      }
      
      currentAmountvyhra = total; // Aktualizace stavu na serveru
      console.log(`[Castka] Manuální načtení ze souboru vyžádáno. Nová částka: ${total}`);
      
      // Odeslání všem připojeným klientům (hlavně castka.html)
      io.emit("vyhra", { number: total });
    } catch (e) {
      console.error("[Castka] Chyba při manuálním načítání částky:", e.message);
    }
  });


  socket.on("zebrikCommand", (data) => {
    if (!data || !data.command) return;
    handleZebrikCommand(data.command);
  });

  // ==========================================
  // --- LOGIKA PRO FINÁLOVOU ŠTVANICI ---
  // ==========================================

  socket.on("finaleCommand", (data) => {
    if (!data || !data.command) return;

    // 1. Zpracování bodů
    if (data.command === "addBox") {
      finaleState.playerScore++;
      socket.emit("addbox");
    } else if (data.command === "removeBox" && finaleState.playerScore > 0) {
      finaleState.playerScore--;
    } else if (data.command === "changeColor") {
      finaleState.hunterScore++;
      socket.emit("changecolor");
    } else if (
      data.command === "changeColorBack" &&
      finaleState.hunterScore > 0
    ) {
      finaleState.hunterScore--;
    }

    console.log(
      `[Finále] Hráč (boxů): ${finaleState.playerScore} | Lovec (červených): ${finaleState.hunterScore}`,
    );

    // 2. Kontrola výhry lovce
    if (
      finaleState.hunterScore >= finaleState.playerScore &&
      finaleState.playerScore > 0
    ) {
      console.log(">>> [FINÁLE] *** LOVEC DOBĚHL HRÁČE! LOVEC VÍTĚZÍ! *** <<<");
      io.emit("prohrals");
    }

    io.emit("finaleCommand", data);
  });

  socket.on("resetFinaleState", () => {
    finaleState.playerScore = 1;
    finaleState.hunterScore = 0;
    console.log(">>> SERVER EVENT: Data pro finále vyresetována (1:0) <<<");
  });



  socket.on("hrac", (data) => {
    if (!allowPlayerAnswer) {
      console.log("[Handler] Hráč odpověď zablokována (neplatné okno).");
      return;
    }

    validatePlayerAnswer(data);

    io.emit("hrac", data);
    console.log(
      `[Handler] Hráč vybral: ${data} (správně: ${questionGameState.playerWon})`,
    );
  });


  socket.on("lovec", (data) => {
    if (!allowHunterAnswer) {
      console.log("[Handler] Lovec odpověď zablokována (neplatné okno).");
      return;
    }

    validateHunterAnswer(data);

    io.emit("lovec", data);
    console.log(
      `[Handler] Lovec vybral: ${data} (správně: ${questionGameState.hunterWon})`,
    );
  });


  socket.on("odpovedhrac", () => {
    // moderator clicked that player has answered; we note it but don't move ladder here
    questionGameState.playerAnswerShown = true;

    io.emit("odpovedhrac", { playerAnswer: questionGameState.playerAnswer });
    console.log(
      `[Validation] Zobrazuji odpověď hráče: ${questionGameState.playerAnswer}`,
    );
  });


  socket.on("odpovedlovec", () => {
    // lovec answer shown by staff; move ladder only if correct
    questionGameState.hunterAnswerShown = true;

    io.emit("odpovedlovec", { hunterAnswer: questionGameState.hunterAnswer });
    console.log(
      `[Validation] Zobrazuji odpověď lovce: ${questionGameState.hunterAnswer}`,
    );

    if (!questionGameState.ladderMovedHunter && questionGameState.hunterWon) {
      console.log("[Validation] Lovec odpověděl správně (controller) - provádím posun");
      handleZebrikCommand('changeImage2');
      questionGameState.ladderMovedHunter = true;
    }
  });


  socket.on("ukazzpravnou", () => {
    questionGameState.correctAnswerShown = true;

    io.emit("ukazzpravnou", { correctAnswer: questionGameState.correctAnswer });
    console.log(
      `[Validation] Zobrazuji správnou odpověď: ${questionGameState.correctAnswer}`,
    );

    // posun jen pokud hráč správně odpověděl
    if (!questionGameState.ladderMovedPlayer && questionGameState.playerWon) {
      console.log("[Validation] Hráč odpověděl správně - provádím posun");
      handleZebrikCommand('changeImage1');
      questionGameState.ladderMovedPlayer = true;
    }
  });

  // ==========================================
  // --- RYCHLÉ PŘIČÍTÁNÍ / ODČÍTÁNÍ 5 000 ---
  // ==========================================

  socket.on("zvyscastku", () => {
    currentAmount += 5000; // Přičte 5 000
    ladderAmounts.middle = currentAmount; // Rovnou to uloží jako základní částku pro žebřík

    console.log(`[Částka] Zvýšeno o 5 000. Nový stav: ${currentAmount}`);

    io.emit("numberInput", { number: currentAmount });
  });

  socket.on("snizcastku", () => {
    // Odečte 5 000, ale ohlídá si, aby částka nešla do mínusu
    if (currentAmount >= 5000) {
      currentAmount -= 5000;
    } else {
      currentAmount = 0;
    }

    ladderAmounts.middle = currentAmount;

    console.log(`[Částka] Sníženo o 5 000. Nový stav: ${currentAmount}`);

    io.emit("numberInput", { number: currentAmount });
  });

  socket.on("lowerAmount", (data) => {
    ladderAmounts.lower = data.number;
    io.emit("lowerAmount", data);
  });

  socket.on("numberInput", (data) => {
    currentAmount = data.number;
    ladderAmounts.middle = data.number;
    io.emit("numberInput", data);
  });

  socket.on("higherAmount", (data) => {
    ladderAmounts.higher = data.number;
    io.emit("higherAmount", data);
  });

  socket.on("zvyscastku", () => {
    io.emit("zvyscastku");
    console.log("Odeslána zpráva: zvyscastku");
  });

  socket.on("snizcastku", () => {
    io.emit("snizcastku");
    console.log("Odeslána zpráva: snizzcastku");
  });

  socket.on("pause", () => {
    io.emit("pause");
    console.log("Odeslána zpráva: pause");
  });

  socket.on("amountType", (data) => {
    ladderState.selectedType = data.type; 

    // Nastavení startovní pozice hráče podle typu částky
    if (data.type === "higher") ladderState.playerLevel = 6;
    else if (data.type === "middle") ladderState.playerLevel = 5;
    else if (data.type === "lower") ladderState.playerLevel = 4;

    playerHasWon = false;

    io.emit("amountType", data);
    io.emit("updateZebrikState", ladderState);
  });

  socket.on("resetKameraCastka", () => {
    currentAmount = 0;
    ladderAmounts.middle = 0;

    console.log(">>> SERVER EVENT: Částka pro 1. kolo vyresetována na 0 <<<");


    io.emit("numberInput", { number: currentAmount });
  });

  socket.on("startTimer", () => {
    io.emit("startTimer");
    console.log("Časovač spuštěn");
  });

  socket.on("play", () => {
    io.emit("play");
    console.log("Časovač spuštěn");
  });

  socket.on("stopAudio", () => {
    console.log(">>> [AUDIO] Nouzové zastavení všech zvuků! <<<");
    io.emit("stopAudio");
  });

  socket.on("reset", () => {
    io.emit("reset");
    console.log("Časovač spuštěn");
  });

  socket.on("vynulujCastku", () => {

    try {
      const castkaPath = path.join(__dirname, "castka");
      fs.writeFileSync(castkaPath, "0", "utf8");
      currentAmountvyhra = 0;
      io.emit("vynulujCastku");
      io.emit("vyhra", { number: 0 });
      console.log("[Castka] Reset to 0 and notified clients.");
    } catch (e) {
      console.error("[Castka] Error resetting castka:", e.message);

      io.emit("vynulujCastku");
    }
  });

  socket.on("hnise", () => {

    if (ladderState.playerLevel > 0) ladderState.playerLevel--;
    io.emit("hnise");
    io.emit("ladderState", ladderState);
    console.log("hnise (server): playerLevel=", ladderState.playerLevel);


    if (!playerHasWon && ladderState.playerLevel <= 0) {
      playerHasWon = true;
      const type = selectedAmountType || "middle";
      const amount = ladderAmounts[type] || 0;
      const total = addToCastka(amount);
      io.emit("playSound", { sound: "playerWin" });
      if (total !== null) {
        currentAmountvyhra = total;
        io.emit("vyhra", { number: total });
        io.emit("playerReached", { amount: total });
      } else {
        io.emit("vyhra", { number: amount });
        io.emit("playerReached", { amount });
      }
    }
  });

  socket.on("lovecvyhra", () => {
    io.emit("lovecvyhra");
    console.log("lovecvyhra");
  });

  socket.on("timerStarted2m", () => {
    io.emit("timerStarted2m");
    console.log("2minzvuk");
  });

  socket.on("minuta", () => {
    io.emit("minuta");
    console.log("minuta");
  });

  socket.on("zacatek", () => {
    io.emit("zacatek");
    console.log("zacatek");
  });

  socket.on("uvodniznelka", () => {
    io.emit("uvodniznelka");
    console.log("uvodniznelka");
  });

  socket.on("lovecprichazi", () => {
    io.emit("lovecprichazi");
    console.log("lovecprichazi");
  });

  socket.on("konec", () => {
    io.emit("konec");
    console.log("konec");
  });

  socket.on("dalsihrac", () => {
    io.emit("dalsihrac");
    console.log("dalsihrac");
  });

  socket.on("petvterin", () => {
    // při přijetí povolit odpovědi po dobu 7 vteřin
    allowPlayerAnswer = true;
    allowHunterAnswer = true;
    io.emit("petvterin");
    // informovat klienty, že mají okno pro odpověď
    io.emit("enableAnswers", { duration: 7000 });
    console.log("petvterin – odpovědi povoleny na 7s");
    // vyčistit předchozí timer a nastavit nový
    if (answerTimer) clearTimeout(answerTimer);
    answerTimer = setTimeout(() => {
      allowPlayerAnswer = false;
      allowHunterAnswer = false;
      io.emit("disableAnswers");
      console.log("Okno pro odpovědi bylo uzavřeno");
    }, 7000);
  });

  socket.on("vypln1", () => {
    io.emit("vypln1");
    console.log("vypln1");
  });

  socket.on("vypln2", () => {
    io.emit("vypln2");
    console.log("vypln2");
  });

  socket.on("vypln3", () => {
    io.emit("vypln3");
    console.log("vypln3");
  });

  socket.on("prohrals", () => {
    io.emit("prohrals");
    console.log("prohrals");
  });

  socket.on("disconnect", () => {
    console.log("Uživatel odpojen");
  });


  socket.on("updateCounter", (hodnota) => {
    let skok = 1;
    if (currentPreset === "scene3") {
      skok = 5000;
    }

    stabCounter += hodnota * skok;

    if (stabCounter < 0) stabCounter = 0;
    io.emit("counterUpdate", stabCounter);
  });

  socket.on("resetCounter", () => {
    stabCounter = 0;
    io.emit("counterUpdate", stabCounter);
  });


  socket.emit("counterUpdate", stabCounter);
});

const dns = require("native-dns");
const dnsServer = dns.createServer();

dnsServer.on("request", (request, response) => {
  if (
    request.question.length > 0 &&
    request.question[0].name.includes("lov.cz")
  ) {
    response.answer.push(
      dns.A({
        name: request.question[0].name,
        address: "192.168.0.100",
        ttl: 600,
      }),
    );
    response.send();
  } else {
    response.send();
  }
});

dnsServer.on("error", (err) => {
  console.log("[DNS Error]", err.message);
});

dnsServer.serve(53);
console.log("[DNS] Server běží a hlídá doménu lov.cz");

server.listen(80, "0.0.0.0", () => {
  console.log("\n========================================");
  console.log(`Na Lovu - SERVER BĚŽÍ`);
  console.log(`Aktuální IP adresa: ${currentIp}`);
  console.log(`Tablety připojte na: http://${currentIp}:80`);
  console.log("========================================\n");
});
