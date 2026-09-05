import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mic, MicOff, X, Volume2, Sparkles, AlertCircle,
  ArrowRight, CornerDownLeft, Languages,
} from "lucide-react";

interface CropPrice {
  min: number; max: number; modal: number; unit: string;
  displayName: string; tamilName: string;
}

const CROPS: Record<string, CropPrice> = {
  paddy:     { min:1800, max:2200, modal:2000, unit:"Quintal", displayName:"Paddy",     tamilName:"நெல்"              },
  maize:     { min:1500, max:2000, modal:1750, unit:"Quintal", displayName:"Maize",     tamilName:"மக்காச்சோளம்"       },
  wheat:     { min:2100, max:2500, modal:2300, unit:"Quintal", displayName:"Wheat",     tamilName:"கோதுமை"            },
  millet:    { min:1600, max:2000, modal:1800, unit:"Quintal", displayName:"Millet",    tamilName:"தினை"              },
  sugarcane: { min:2800, max:3500, modal:3100, unit:"Tonne",   displayName:"Sugarcane", tamilName:"கரும்பு"           },
  groundnut: { min:4500, max:5500, modal:5000, unit:"Quintal", displayName:"Groundnut", tamilName:"கடலை"              },
  cotton:    { min:6000, max:7500, modal:6750, unit:"Quintal", displayName:"Cotton",    tamilName:"பருத்தி"           },
  tomato:    { min:10,   max:25,   modal:18,   unit:"Kg",      displayName:"Tomato",    tamilName:"தக்காளி"           },
  onion:     { min:20,   max:45,   modal:32,   unit:"Kg",      displayName:"Onion",     tamilName:"வெங்காயம்"         },
  potato:    { min:15,   max:30,   modal:22,   unit:"Kg",      displayName:"Potato",    tamilName:"உருளைக்கிழங்கு"   },
  brinjal:   { min:10,   max:20,   modal:15,   unit:"Kg",      displayName:"Brinjal",   tamilName:"கத்தரிக்காய்"      },
  banana:    { min:20,   max:40,   modal:30,   unit:"Kg",      displayName:"Banana",    tamilName:"வாழை"              },
  mango:     { min:40,   max:90,   modal:65,   unit:"Kg",      displayName:"Mango",     tamilName:"மாம்பழம்"          },
  coconut:   { min:15,   max:30,   modal:22,   unit:"Piece",   displayName:"Coconut",   tamilName:"தேங்காய்"          },
  chilli:    { min:70,   max:140,  modal:105,  unit:"Kg",      displayName:"Chilli",    tamilName:"மிளகாய்"           },
};

const CROP_ALIASES: Record<string, string[]> = {
  paddy:     ["paddy","rice","nel","nellu","arisi","நெல்","நெல்லு","அரிசி"],
  maize:     ["maize","corn","makkacholam","makka cholam","makkachola","cholam","மக்காச்சோளம்","சோளம்"],
  wheat:     ["wheat","kodhumai","gothumai","கோதுமை"],
  millet:    ["millet","thinai","thinne","kambu","கம்பு","தினை"],
  sugarcane: ["sugarcane","sugar cane","karumbu","கரும்பு"],
  groundnut: ["groundnut","peanut","kadalai","verkadalai","கடலை","வேர்க்கடலை"],
  cotton:    ["cotton","paruthi","பருத்தி"],
  tomato:    ["tomato","thakkali","தக்காளி"],
  onion:     ["onion","vengayam","வெங்காயம்"],
  potato:    ["potato","urulaikizhangku","urulaikizhangu","உருளைக்கிழங்கு"],
  brinjal:   ["brinjal","eggplant","katharikai","kathirikai","கத்தரிக்காய்"],
  banana:    ["banana","vaazhai","vazhai","வாழை"],
  mango:     ["mango","maambazham","mampaazham","மாம்பழம்","மாங்காய்"],
  coconut:   ["coconut","thengai","தேங்காய்"],
  chilli:    ["chilli","chili","milagai","மிளகாய்"],
};

const NAV_KEYWORDS: Record<string, string[]> = {
  marketplace: ["marketplace","market","browse crops","crop store","bazaar","market open pannu","market kaatu","கடை","மார்க்கெட்","open market"],
  my_bookings: ["my bookings","my booking","booking status","view bookings","en bookings","en bookings kaatu","bookings kaatu","என் புக்கிங்ஸ்","என் முன்பதிவு","bookings paaru"],
  profile:     ["profile","my profile","account","settings","profile open pannu","profile kaatu","சுயவிவரம்","புரோஃபைல்"],
  home:        ["home","dashboard","main menu","go home","go to home","home open pannu","home kaatu","வீடு","முகப்பு"],
  rain_map:    ["rain","weather","radar","forecast","rain map","rain prediction","mazhai","மழை","வானிலை"],
  ai_advisory: ["ai","advisory","recommendation","advice","ai advisory","farm advice","யோசனை","ai யோசனை"],
  soil:        ["soil","soil health","soil status","mann","மண்","மண் ஆரோக்கியம்"],
  records:     ["records","farm records","my records","விவரங்கள்"],
  pre_booking: ["pre-book","pre book","prebook","book crop","new booking","book pannu","புக் பண்ணு","முன்பதிவு"],
};

const PRICE_TRIGGERS = ["price","rate","cost","how much","vilai","nilai","enna vilai","என்ன விலை","விலை","விலை என்ன","vilai kaatu","vilai enna","what is the","show price","vilai sollu"];
const BOOK_TRIGGERS  = ["book","pre-book","prebook","book pannu","புக் பண்ணு","முன்பதிவு"];

type Lang = "en-IN" | "ta-IN";

function normalize(text: string): string {
  return text.toLowerCase().replace(/[.,!?।]/g," ").replace(/\s+/g," ").trim();
}
function detectCrop(raw: string): string | null {
  for (const [key, aliases] of Object.entries(CROP_ALIASES))
    for (const alias of aliases)
      if (raw.includes(normalize(alias))) return key;
  return null;
}
function hasTrigger(raw: string, triggers: string[]): boolean {
  return triggers.some((t) => raw.includes(normalize(t)));
}
function detectNavIntent(raw: string): string | null {
  for (const [intent, keywords] of Object.entries(NAV_KEYWORDS))
    for (const kw of keywords)
      if (raw.includes(normalize(kw))) return intent;
  return null;
}

function priceResponse(cropKey: string, lang: Lang) {
  const p = CROPS[cropKey];
  if (lang === "ta-IN") {
    return {
      spoken: `${p.tamilName}ன் தற்போதைய reference விலை ஒரு ${p.unit}-க்கு ${p.modal} ரூபாய். குறைந்தபட்சம் ${p.min}, அதிகபட்சம் ${p.max}.`,
      feedback: `📊 ${p.tamilName}: ₹${p.modal} / ${p.unit}  (₹${p.min} – ₹${p.max})`,
    };
  }
  return {
    spoken: `The current reference price for ${p.displayName} is ${p.modal} rupees per ${p.unit}. Range: ${p.min} to ${p.max} rupees.`,
    feedback: `📊 ${p.displayName}: ₹${p.modal} / ${p.unit}  (₹${p.min} – ₹${p.max})`,
  };
}

function navResponse(intent: string, lang: Lang) {
  const map: Record<string, { en: string; ta: string; route: string }> = {
    marketplace: { en:"Opening AgriNex Marketplace",          ta:"மார்க்கெட் திறக்கிறோம்",                  route:"/marketplace"       },
    my_bookings: { en:"Opening your Pre-Bookings",             ta:"உங்கள் புக்கிங்ஸ் காட்டுகிறோம்",          route:"/my-bookings"       },
    profile:     { en:"Opening Profile",                       ta:"புரோஃபைல் திறக்கிறோம்",                  route:"/profile"           },
    home:        { en:"Returning to Home Dashboard",           ta:"முகப்பு பக்கம் செல்கிறோம்",               route:"/"                  },
    rain_map:    { en:"Opening Rain Prediction Map",           ta:"மழை வரைபடம் திறக்கிறோம்",                 route:"/rain-map"          },
    ai_advisory: { en:"Opening AI Farming Advisory",           ta:"AI விவசாய யோசனை திறக்கிறோம்",            route:"/ai-recommendation" },
    soil:        { en:"Opening Soil Health Status",            ta:"மண் ஆரோக்கிய நிலை திறக்கிறோம்",          route:"/soil-status"       },
    records:     { en:"Opening Farm Records",                  ta:"விவசாய விவரங்கள் திறக்கிறோம்",           route:"/records"           },
    pre_booking: { en:"Opening Marketplace for Pre-Booking",   ta:"முன்பதிவுக்கு மார்க்கெட் திறக்கிறோம்",   route:"/marketplace"       },
  };
  const info = map[intent] ?? map.marketplace;
  const spoken = lang === "ta-IN" ? info.ta : info.en;
  return { spoken, feedback: `✅ ${spoken}`, route: info.route };
}

function notUnderstoodResponse(lang: Lang): string {
  return lang === "ta-IN"
    ? "மன்னிக்கவும், உங்கள் கட்டளையை புரிந்து கொள்ள முடியவில்லை. மீண்டும் முயற்சிக்கவும்."
    : "Sorry, I did not understand that command. Please try again.";
}

export default function VoiceAssistant() {
  const navigate = useNavigate();
  const [isOpen,      setIsOpen]      = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript,  setTranscript]  = useState("");
  const [feedback,    setFeedback]    = useState("");
  const [errorMsg,    setErrorMsg]    = useState<string | null>(null);
  const [textInput,   setTextInput]   = useState("");
  const [priceCard,   setPriceCard]   = useState<(CropPrice & { key: string }) | null>(null);
  const [lang,        setLang]        = useState<Lang>("en-IN");
  const recognitionRef = useRef<any>(null);

  const hasSpeechRecognition =
    typeof window !== "undefined" &&
    Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  const speakText = (text: string, speakLang?: Lang) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = speakLang ?? lang;
    u.rate = 0.95;
    u.pitch = 1.0;
    window.speechSynthesis.speak(u);
  };

  const startListening = () => {
    setErrorMsg(null);
    setPriceCard(null);
    setTranscript("");
    setFeedback(lang === "ta-IN" ? "🎙️ கேட்கிறோம்... தமிழில் பேசுங்கள்" : "🎙️ Listening... Speak now");

    if (!hasSpeechRecognition) {
      setErrorMsg("Voice recognition is not supported in this browser. Please use the text input below.");
      return;
    }

    try {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const r = new SR();
      r.continuous = false;
      r.interimResults = true;
      r.lang = lang;

      r.onstart = () => {
        setIsListening(true);
        setFeedback(lang === "ta-IN" ? "🎙️ கேட்கிறோம்... இப்போது பேசுங்கள்" : "🎙️ Listening... Speak now");
      };

      r.onresult = (e: any) => {
        let s = "";
        for (let i = e.resultIndex; i < e.results.length; ++i) {
          s += e.results[i][0].transcript;
        }
        setTranscript(s);
      };

      r.onerror = (e: any) => {
        setIsListening(false);
        if (e.error === "not-allowed" || e.error === "permission-denied") {
          setErrorMsg(lang === "ta-IN" ? "மைக்ரோஃபோன் அனுமதி இல்லை. கீழே தட்டச்சு செய்யவும்." : "Microphone permission denied. Please use text input.");
        } else if (e.error === "no-speech") {
          setFeedback(lang === "ta-IN" ? "பேச்சு கண்டுபிடிக்கவில்லை. மீண்டும் தட்டவும்." : "No speech detected. Tap mic to try again.");
        } else if (e.error === "language-not-supported") {
          setErrorMsg("Tamil recognition not available in this browser. Switch to EN mode or type below.");
        } else {
          setErrorMsg(lang === "ta-IN" ? `குரல் பிழை: ${e.error}` : `Voice error: ${e.error}. Please use text input.`);
        }
      };

      r.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = r;
      r.start();
    } catch (err: any) {
      setIsListening(false);
      setErrorMsg("Unable to start microphone. Please use text input.");
    }
  };

  const stopListening = () => {
    try {
      recognitionRef.current?.stop();
    } catch (_) {}
    setIsListening(false);
  };

  const executeCommand = (cmd: string, cmdLang?: Lang) => {
    const useLang = cmdLang ?? lang;
    const raw = normalize(cmd);
    if (!raw) return;
    setFeedback(useLang === "ta-IN" ? `🔍 செயலாக்குகிறோம்: "${cmd}"` : `🔍 Processing: "${cmd}"`);

    if (hasTrigger(raw, PRICE_TRIGGERS)) {
      const ck = detectCrop(raw);
      if (ck) {
        const { spoken, feedback: fb } = priceResponse(ck, useLang);
        setPriceCard({ key: ck, ...CROPS[ck] });
        setFeedback(fb);
        speakText(spoken, useLang);
        return;
      }
      const msg = useLang === "ta-IN" ? "அனைத்து பயிர் விலைகளும் மார்க்கெட்டில் உள்ளன" : "Opening Marketplace for all crop prices";
      setFeedback(`📈 ${msg}`);
      speakText(msg, useLang);
      setTimeout(() => {
        setIsOpen(false);
        navigate("/marketplace");
      }, 800);
      return;
    }

    if (hasTrigger(raw, BOOK_TRIGGERS)) {
      const intent = detectNavIntent(raw);
      if (intent === "my_bookings") {
        const { spoken, feedback: fb, route } = navResponse("my_bookings", useLang);
        setFeedback(fb);
        speakText(spoken, useLang);
        setTimeout(() => {
          setIsOpen(false);
          navigate(route);
        }, 700);
        return;
      }
      const ck = detectCrop(raw);
      if (ck) {
        const p = CROPS[ck];
        const msg = useLang === "ta-IN" ? `${p.tamilName} முன்பதிவுக்கு மார்க்கெட் திறக்கிறோம்` : `Navigating to Marketplace to pre-book ${p.displayName}`;
        setFeedback(`✅ ${msg}`);
        speakText(msg, useLang);
        setTimeout(() => {
          setIsOpen(false);
          navigate("/marketplace");
        }, 700);
        return;
      }
    }

    const intent = detectNavIntent(raw);
    if (intent) {
      const { spoken, feedback: fb, route } = navResponse(intent, useLang);
      setFeedback(fb);
      speakText(spoken, useLang);
      setTimeout(() => {
        setIsOpen(false);
        navigate(route);
      }, 700);
      return;
    }

    const ck = detectCrop(raw);
    if (ck) {
      const { spoken, feedback: fb } = priceResponse(ck, useLang);
      setPriceCard({ key: ck, ...CROPS[ck] });
      setFeedback(fb);
      speakText(spoken, useLang);
      return;
    }

    setFeedback(useLang === "ta-IN" ? `⚠️ புரியவில்லை — "${cmd}". மீண்டும் முயற்சிக்கவும்.` : `⚠️ Not understood — "${cmd}". Try: "Price of Paddy" or "Open Marketplace".`);
    speakText(notUnderstoodResponse(useLang), useLang);
  };

  useEffect(() => {
    if (!isListening && transcript.trim().length > 0) {
      executeCommand(transcript, lang);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isListening]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (textInput.trim()) {
      executeCommand(textInput, lang);
      setTextInput("");
    }
  };

  const toggleLang = () => {
    stopListening();
    setLang((p) => (p === "en-IN" ? "ta-IN" : "en-IN"));
    setErrorMsg(null);
    setFeedback("");
    setTranscript("");
    setPriceCard(null);
  };

  const CHIPS_EN = ["Paddy price", "Mango price", "Book Wheat", "Marketplace", "My Bookings", "Rain Prediction", "AI Advisory", "Profile"];
  const CHIPS_TA = ["நெல் விலை", "மாம்பழம் விலை", "கோதுமை புக் பண்ணு", "மார்க்கெட் ஓபன் பண்ணு", "என் புக்கிங்ஸ் காட்டு", "மழை வரைபடம்", "AI யோசனை", "புரோஃபைல் காட்டு"];
  const chips = lang === "ta-IN" ? CHIPS_TA : CHIPS_EN;
  const isTamil = lang === "ta-IN";

  return (
    <>
      <button id="voice-fab-btn" onClick={() => { setIsOpen(true); startListening(); }} aria-label="Open Voice Access" title="AgriNex Voice Assistant" className="fixed bottom-24 right-5 z-40 bg-[#2D6A4F] hover:bg-[#1B4332] text-white p-3.5 rounded-full shadow-lg flex items-center justify-center transition-transform active:scale-95 group border-2 border-white/80">
        <Mic size={24} className="text-white group-hover:scale-110 transition-transform" /><span className="sr-only">Voice Access</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-green-50 text-[#2D6A4F] rounded-xl"><Sparkles size={20} /></div>
                <div><h3 className="font-black text-[#1B4332] text-lg">AgriNex Voice Access</h3><p className="text-xs text-gray-500 font-medium">{isTamil ? "குரல் உதவியாளர் — விவசாயிகளுக்காக" : "Smart Voice Assistant for Farmers"}</p></div>
              </div>
              <div className="flex items-center gap-2">
                <button id="voice-lang-toggle" onClick={toggleLang} title={isTamil ? "Switch to English" : "தமிழுக்கு மாறு"} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${isTamil ? "bg-orange-100 border-orange-300 text-orange-800 hover:bg-orange-200" : "bg-green-50 border-green-300 text-[#2D6A4F] hover:bg-green-100"}`}><Languages size={13} />{isTamil ? "தமிழ்" : "EN"}</button>
                <button onClick={() => { stopListening(); setIsOpen(false); }} className="p-2 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100" aria-label="Close"><X size={20} /></button>
              </div>
            </div>

            <div className={`mb-4 text-center py-1.5 px-3 rounded-xl text-xs font-semibold ${isTamil ? "bg-orange-50 text-orange-700 border border-orange-200" : "bg-green-50 text-[#2D6A4F] border border-green-200"}`}>
              {isTamil ? "🎙️ தமிழ் / Tanglish / English — எந்த மொழியிலும் பேசலாம்" : "🎙️ Speak in English or Tanglish — Tamil crop names also understood"}
            </div>

            <div className="flex flex-col items-center justify-center py-5 text-center">
              <div className="relative mb-4">
                {isListening && (<><div className="absolute inset-0 rounded-full bg-green-400 opacity-30 animate-ping" /><div className="absolute inset-0 rounded-full bg-green-300 opacity-20 animate-ping" style={{ animationDelay:"0.3s" }} /></>)}
                <button id="voice-mic-btn" onClick={() => { if (isListening) stopListening(); else startListening(); }} aria-label={isListening ? "Stop listening" : "Start listening"} className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all ${isListening ? "bg-red-500 text-white scale-105 ring-4 ring-red-200" : "bg-[#2D6A4F] text-white hover:bg-[#1B4332] hover:scale-105"}`}>
                  {isListening ? <Mic size={36} className="animate-pulse" /> : <MicOff size={36} />}
                </button>
              </div>
              <p className="text-sm font-bold text-[#1B4332] mb-1">{isListening ? (isTamil ? "கேட்கிறோம்... பேசுங்கள்" : "Listening... Speak your command") : (isTamil ? "Mic-ஐ தட்டி பேசுங்கள்" : "Tap the mic to speak")}</p>
              {feedback && <p className="text-xs text-gray-600 max-w-xs leading-relaxed">{feedback}</p>}

              {transcript && (<div className="mt-4 bg-green-50/80 border border-green-200 text-[#1B4332] text-sm p-3 rounded-2xl w-full text-left flex items-start gap-2"><Volume2 size={16} className="mt-0.5 text-[#2D6A4F] shrink-0" /><span className="font-medium italic">"{transcript}"</span></div>)}

              {priceCard && (
                <div className="mt-4 bg-blue-50 border border-blue-200 text-blue-900 p-4 rounded-2xl w-full text-left">
                  <div className="flex justify-between items-start mb-1"><div><span className="font-black text-base">🌾 {priceCard.displayName}</span><span className="ml-2 text-xs text-blue-600 font-semibold">{priceCard.tamilName}</span></div><span className="bg-blue-200/80 text-blue-900 text-xs px-2.5 py-0.5 rounded-full font-bold whitespace-nowrap">₹{priceCard.modal} / {priceCard.unit}</span></div>
                  <p className="text-xs text-blue-700 mb-3">{isTamil ? `குறைந்தபட்சம்: ₹${priceCard.min} | அதிகபட்சம்: ₹${priceCard.max} / ${priceCard.unit}` : `Range: ₹${priceCard.min} – ₹${priceCard.max} / ${priceCard.unit}`}</p>
                  <button onClick={() => { setIsOpen(false); navigate("/marketplace"); }} className="w-full bg-[#2D6A4F] text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 hover:bg-[#1B4332] transition-colors"><span>{isTamil ? `${priceCard.tamilName} முன்பதிவு செய்யவும்` : `Pre-Book ${priceCard.displayName}`}</span><ArrowRight size={14} /></button>
                </div>
              )}

              {errorMsg && (<div className="mt-4 bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3 rounded-2xl w-full flex items-start gap-2 text-left"><AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" /><span>{errorMsg}</span></div>)}
            </div>

            <div className="mb-4">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">{isTamil ? "இவற்றை முயற்சிக்கவும்:" : "Try saying:"}</p>
              <div className="flex flex-wrap gap-1.5">{chips.map((chip) => (<button key={chip} onClick={() => executeCommand(chip, lang)} className="bg-gray-100 hover:bg-green-100 text-[#1B4332] text-xs font-semibold px-3 py-1.5 rounded-full transition-colors">{chip}</button>))}</div>
            </div>

            <form onSubmit={handleManualSubmit} className="relative mt-2">
              <input type="text" value={textInput} onChange={(e) => setTextInput(e.target.value)} placeholder={isTamil ? "கட்டளை தட்டச்சு செய்யவும்... (எ.கா. நெல் விலை)" : "Or type a command... (e.g. Price of Paddy)"} className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-xs text-[#1B4332] pr-10 focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]" />
              <button type="submit" className="absolute right-2 top-1.5 p-1.5 text-[#2D6A4F] hover:bg-green-100 rounded-xl transition-colors" aria-label="Submit command"><CornerDownLeft size={16} /></button>
            </form>

            <p className="mt-3 text-center text-[10px] text-gray-400 leading-relaxed">{isTamil ? "குரல் அங்கீகாரம் browser-ஐ சார்ந்தது. Chrome Desktop/Android-ல் தமிழ் சிறப்பாக செயல்படும்." : "Voice recognition requires browser support. Chrome works best. Tamil mode needs a Tamil voice pack."}</p>
          </div>
        </div>
      )}
    </>
  );
}
