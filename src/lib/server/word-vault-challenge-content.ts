// AUTO-GENERATED — do not edit by hand.
// Source: Word_Vault_Listening_and_Story_Challenge.docx
// Regenerate: py scripts/generate_word_vault_listening_content.py
import "server-only";

/** One Activity A dictation item (one per Word Vault word, IDs 1-120). */
export type DictationItem = {
  id: number;
  /** 1..6 — the Word Vault category (see DICTATION_CATEGORY_NAMES). */
  category: number;
  /** The word whose spelling is being tested (the hidden key). */
  target: string;
  /** British (RP) phonetic transcription — never shown before marking. */
  ipa: string;
  /** Disambiguating note such as "adj." / "verb" — empty when none. */
  note: string;
  /** The sentence read aloud; the student types it from memory. */
  sentence: string;
  /** The classic wrong spelling, used for feedback only. */
  typicalError: string;
  /** February and Wednesday must be typed with a capital first letter. */
  capitalRequired: boolean;
};

/** A story chunk: plain text, or a gap the student must fill in. */
export type StoryChunk =
  | { type: "text"; value: string }
  | { type: "gap"; id: number; word: string };

/** One gap-fill story chapter (Activity B). */
export type StoryChapter = {
  chapter: number;
  title: string;
  /** paragraphs → chunks → text/gap. */
  paragraphs: StoryChunk[][];
};

/** Category names, keyed by category number (1..6). */
export const DICTATION_CATEGORY_NAMES: Record<number, string> = {
  "1": "Vowels silently dropped or added",
  "2": "Silent letters",
  "3": "Unexpected letter combinations",
  "4": "“ie / ei” and doubled-letter confusions",
  "5": "Everyday words often misspelled by sound",
  "6": "British spelling patterns"
};

/** The 120 Activity A dictation items, in ID order. */
export const DICTATION_ITEMS: DictationItem[] = [
  {
    "id": 1,
    "category": 1,
    "target": "every",
    "ipa": "/ˈevri/",
    "note": "",
    "sentence": "The teacher checks every answer carefully before she hands back the tests.",
    "typicalError": "evry",
    "capitalRequired": false
  },
  {
    "id": 2,
    "category": 1,
    "target": "heavy",
    "ipa": "/ˈhevi/",
    "note": "",
    "sentence": "The heavy box was too much for the small boy to lift.",
    "typicalError": "hevy",
    "capitalRequired": false
  },
  {
    "id": 3,
    "category": 1,
    "target": "hurt",
    "ipa": "/hɜːt/",
    "note": "",
    "sentence": "Be careful with the hammer, or you might hurt your hand.",
    "typicalError": "hourt",
    "capitalRequired": false
  },
  {
    "id": 4,
    "category": 1,
    "target": "listen",
    "ipa": "/ˈlɪsn/",
    "note": "",
    "sentence": "Please listen carefully to the instructions before you begin.",
    "typicalError": "lisen",
    "capitalRequired": false
  },
  {
    "id": 5,
    "category": 1,
    "target": "business",
    "ipa": "/ˈbɪznəs/",
    "note": "",
    "sentence": "My uncle started a small business selling fresh bread.",
    "typicalError": "busness",
    "capitalRequired": false
  },
  {
    "id": 6,
    "category": 1,
    "target": "different",
    "ipa": "/ˈdɪfrənt/",
    "note": "",
    "sentence": "These two shirts look the same, but the sizes are different.",
    "typicalError": "diffrent",
    "capitalRequired": false
  },
  {
    "id": 7,
    "category": 1,
    "target": "chocolate",
    "ipa": "/ˈtʃɒklət/",
    "note": "",
    "sentence": "She melted the chocolate and poured it over the warm cake.",
    "typicalError": "choclate",
    "capitalRequired": false
  },
  {
    "id": 8,
    "category": 1,
    "target": "vegetable",
    "ipa": "/ˈvedʒtəbl/",
    "note": "",
    "sentence": "Spinach is a green vegetable that is full of iron.",
    "typicalError": "vegtable",
    "capitalRequired": false
  },
  {
    "id": 9,
    "category": 1,
    "target": "interesting",
    "ipa": "/ˈɪntrəstɪŋ/",
    "note": "",
    "sentence": "The lecture on space was so interesting that nobody yawned.",
    "typicalError": "intresting",
    "capitalRequired": false
  },
  {
    "id": 10,
    "category": 1,
    "target": "restaurant",
    "ipa": "/ˈrestrɒnt/",
    "note": "",
    "sentence": "We booked a table at a new restaurant near the market.",
    "typicalError": "resturant",
    "capitalRequired": false
  },
  {
    "id": 11,
    "category": 1,
    "target": "comfortable",
    "ipa": "/ˈkʌmftəbl/",
    "note": "",
    "sentence": "This old sofa is soft and very comfortable.",
    "typicalError": "comftable",
    "capitalRequired": false
  },
  {
    "id": 12,
    "category": 1,
    "target": "family",
    "ipa": "/ˈfæməli/",
    "note": "",
    "sentence": "A large family gathered at the house for the festival.",
    "typicalError": "famly",
    "capitalRequired": false
  },
  {
    "id": 13,
    "category": 1,
    "target": "separate",
    "ipa": "/ˈseprət/",
    "note": "adj.",
    "sentence": "Please keep the red pens in a separate box.",
    "typicalError": "seperate",
    "capitalRequired": false
  },
  {
    "id": 14,
    "category": 1,
    "target": "temperature",
    "ipa": "/ˈtemprətʃə(r)/",
    "note": "",
    "sentence": "The doctor took his temperature with a small thermometer.",
    "typicalError": "temperture",
    "capitalRequired": false
  },
  {
    "id": 15,
    "category": 1,
    "target": "history",
    "ipa": "/ˈhɪstri/",
    "note": "",
    "sentence": "We study the history of our country on Fridays.",
    "typicalError": "histry",
    "capitalRequired": false
  },
  {
    "id": 16,
    "category": 1,
    "target": "camera",
    "ipa": "/ˈkæmrə/",
    "note": "",
    "sentence": "He packed a new camera for the school trip.",
    "typicalError": "camra",
    "capitalRequired": false
  },
  {
    "id": 17,
    "category": 1,
    "target": "general",
    "ipa": "/ˈdʒenrəl/",
    "note": "",
    "sentence": "The general rule is to knock before you enter.",
    "typicalError": "genral",
    "capitalRequired": false
  },
  {
    "id": 18,
    "category": 1,
    "target": "several",
    "ipa": "/ˈsevrəl/",
    "note": "",
    "sentence": "Several birds landed on the roof of the shed.",
    "typicalError": "sevral",
    "capitalRequired": false
  },
  {
    "id": 19,
    "category": 1,
    "target": "average",
    "ipa": "/ˈævərɪdʒ/",
    "note": "",
    "sentence": "Her average mark this term was higher than last term.",
    "typicalError": "avrage",
    "capitalRequired": false
  },
  {
    "id": 20,
    "category": 1,
    "target": "memory",
    "ipa": "/ˈmeməri/",
    "note": "",
    "sentence": "I have a happy memory of my first day at school.",
    "typicalError": "memry",
    "capitalRequired": false
  },
  {
    "id": 21,
    "category": 2,
    "target": "honest",
    "ipa": "/ˈɒnɪst/",
    "note": "",
    "sentence": "It is always better to be honest with your parents.",
    "typicalError": "onest",
    "capitalRequired": false
  },
  {
    "id": 22,
    "category": 2,
    "target": "guard",
    "ipa": "/ɡɑːd/",
    "note": "",
    "sentence": "A guard stood at the gate of the old palace.",
    "typicalError": "gard",
    "capitalRequired": false
  },
  {
    "id": 23,
    "category": 2,
    "target": "answer",
    "ipa": "/ˈɑːnsə(r)/",
    "note": "",
    "sentence": "Write your answer clearly in the space below.",
    "typicalError": "anser",
    "capitalRequired": false
  },
  {
    "id": 24,
    "category": 2,
    "target": "calendar",
    "ipa": "/ˈkælɪndə(r)/",
    "note": "",
    "sentence": "She marked the date of the party on the calendar.",
    "typicalError": "calender",
    "capitalRequired": false
  },
  {
    "id": 25,
    "category": 2,
    "target": "half",
    "ipa": "/hɑːf/",
    "note": "",
    "sentence": "He ate half of the orange and gave me the rest.",
    "typicalError": "haf",
    "capitalRequired": false
  },
  {
    "id": 26,
    "category": 2,
    "target": "could",
    "ipa": "/kʊd/",
    "note": "",
    "sentence": "I could hear the rain drumming on the roof.",
    "typicalError": "coud",
    "capitalRequired": false
  },
  {
    "id": 27,
    "category": 2,
    "target": "would",
    "ipa": "/wʊd/",
    "note": "",
    "sentence": "My mother would like to meet your teacher.",
    "typicalError": "woud",
    "capitalRequired": false
  },
  {
    "id": 28,
    "category": 2,
    "target": "should",
    "ipa": "/ʃʊd/",
    "note": "",
    "sentence": "You should wash your hands before you eat.",
    "typicalError": "shoud",
    "capitalRequired": false
  },
  {
    "id": 29,
    "category": 2,
    "target": "knife",
    "ipa": "/naɪf/",
    "note": "",
    "sentence": "Use a sharp knife to slice the bread.",
    "typicalError": "nife",
    "capitalRequired": false
  },
  {
    "id": 30,
    "category": 2,
    "target": "island",
    "ipa": "/ˈaɪlənd/",
    "note": "",
    "sentence": "A small island lay far out in the bay.",
    "typicalError": "iland",
    "capitalRequired": false
  },
  {
    "id": 31,
    "category": 2,
    "target": "autumn",
    "ipa": "/ˈɔːtəm/",
    "note": "",
    "sentence": "The leaves turn brown and fall in autumn.",
    "typicalError": "autum",
    "capitalRequired": false
  },
  {
    "id": 32,
    "category": 2,
    "target": "condemn",
    "ipa": "/kənˈdem/",
    "note": "",
    "sentence": "The villagers condemn any act of cruelty.",
    "typicalError": "condem",
    "capitalRequired": false
  },
  {
    "id": 33,
    "category": 2,
    "target": "foreign",
    "ipa": "/ˈfɒrən/",
    "note": "",
    "sentence": "She is learning to speak a foreign language.",
    "typicalError": "forein",
    "capitalRequired": false
  },
  {
    "id": 34,
    "category": 2,
    "target": "ghost",
    "ipa": "/ɡəʊst/",
    "note": "",
    "sentence": "The children told a story about a ghost in the old house.",
    "typicalError": "gost",
    "capitalRequired": false
  },
  {
    "id": 35,
    "category": 2,
    "target": "climb",
    "ipa": "/klaɪm/",
    "note": "",
    "sentence": "It took us an hour to climb the steep hill.",
    "typicalError": "clim",
    "capitalRequired": false
  },
  {
    "id": 36,
    "category": 2,
    "target": "thumb",
    "ipa": "/θʌm/",
    "note": "",
    "sentence": "She wore a plaster on her thumb.",
    "typicalError": "thum",
    "capitalRequired": false
  },
  {
    "id": 37,
    "category": 2,
    "target": "comb",
    "ipa": "/kəʊm/",
    "note": "",
    "sentence": "Use a wide comb to untangle your hair.",
    "typicalError": "coam",
    "capitalRequired": false
  },
  {
    "id": 38,
    "category": 2,
    "target": "wrist",
    "ipa": "/rɪst/",
    "note": "",
    "sentence": "He wears a silver watch on his left wrist.",
    "typicalError": "rist",
    "capitalRequired": false
  },
  {
    "id": 39,
    "category": 2,
    "target": "sword",
    "ipa": "/sɔːd/",
    "note": "",
    "sentence": "The knight raised his sword and shouted.",
    "typicalError": "sord",
    "capitalRequired": false
  },
  {
    "id": 40,
    "category": 2,
    "target": "muscle",
    "ipa": "/ˈmʌsl/",
    "note": "",
    "sentence": "Exercise builds a strong muscle in your leg.",
    "typicalError": "mussle",
    "capitalRequired": false
  },
  {
    "id": 41,
    "category": 3,
    "target": "though",
    "ipa": "/ðəʊ/",
    "note": "",
    "sentence": "I enjoyed the match, though our team lost.",
    "typicalError": "tho",
    "capitalRequired": false
  },
  {
    "id": 42,
    "category": 3,
    "target": "enough",
    "ipa": "/ɪˈnʌf/",
    "note": "",
    "sentence": "We have enough food to feed the whole street.",
    "typicalError": "enuff",
    "capitalRequired": false
  },
  {
    "id": 43,
    "category": 3,
    "target": "laugh",
    "ipa": "/lɑːf/",
    "note": "",
    "sentence": "The clown made the children laugh out loud.",
    "typicalError": "laff",
    "capitalRequired": false
  },
  {
    "id": 44,
    "category": 3,
    "target": "through",
    "ipa": "/θruː/",
    "note": "",
    "sentence": "The train rushed through the tunnel.",
    "typicalError": "thorugh",
    "capitalRequired": false
  },
  {
    "id": 45,
    "category": 3,
    "target": "thought",
    "ipa": "/θɔːt/",
    "note": "",
    "sentence": "I thought about her advice all night.",
    "typicalError": "thougt",
    "capitalRequired": false
  },
  {
    "id": 46,
    "category": 3,
    "target": "daughter",
    "ipa": "/ˈdɔːtə(r)/",
    "note": "",
    "sentence": "Their daughter won a prize at the science fair.",
    "typicalError": "dauter",
    "capitalRequired": false
  },
  {
    "id": 47,
    "category": 3,
    "target": "neighbour",
    "ipa": "/ˈneɪbə(r)/",
    "note": "",
    "sentence": "Our neighbour lends us a ladder when we need one.",
    "typicalError": "nieghbour",
    "capitalRequired": false
  },
  {
    "id": 48,
    "category": 3,
    "target": "height",
    "ipa": "/haɪt/",
    "note": "",
    "sentence": "The height of the tower amazed the visitors.",
    "typicalError": "hieght",
    "capitalRequired": false
  },
  {
    "id": 49,
    "category": 3,
    "target": "weight",
    "ipa": "/weɪt/",
    "note": "",
    "sentence": "Please check the weight of the parcel before posting it.",
    "typicalError": "wieght",
    "capitalRequired": false
  },
  {
    "id": 50,
    "category": 3,
    "target": "straight",
    "ipa": "/streɪt/",
    "note": "",
    "sentence": "Walk straight ahead until you reach the bridge.",
    "typicalError": "streight",
    "capitalRequired": false
  },
  {
    "id": 51,
    "category": 3,
    "target": "caught",
    "ipa": "/kɔːt/",
    "note": "",
    "sentence": "The goalkeeper caught the ball with both hands.",
    "typicalError": "cought",
    "capitalRequired": false
  },
  {
    "id": 52,
    "category": 3,
    "target": "bought",
    "ipa": "/bɔːt/",
    "note": "",
    "sentence": "My aunt bought a bag of oranges at the market.",
    "typicalError": "bougth",
    "capitalRequired": false
  },
  {
    "id": 53,
    "category": 3,
    "target": "cough",
    "ipa": "/kɒf/",
    "note": "",
    "sentence": "A dry cough kept him awake all night.",
    "typicalError": "coff",
    "capitalRequired": false
  },
  {
    "id": 54,
    "category": 3,
    "target": "rough",
    "ipa": "/rʌf/",
    "note": "",
    "sentence": "The sea was rough, and the little boat rocked wildly.",
    "typicalError": "ruf",
    "capitalRequired": false
  },
  {
    "id": 55,
    "category": 3,
    "target": "tough",
    "ipa": "/tʌf/",
    "note": "",
    "sentence": "The meat was tough, so we cooked it for longer.",
    "typicalError": "tuf",
    "capitalRequired": false
  },
  {
    "id": 56,
    "category": 3,
    "target": "thorough",
    "ipa": "/ˈθʌrə/",
    "note": "",
    "sentence": "The police made a thorough search of the building.",
    "typicalError": "thourough",
    "capitalRequired": false
  },
  {
    "id": 57,
    "category": 3,
    "target": "brought",
    "ipa": "/brɔːt/",
    "note": "",
    "sentence": "She brought a cake to the party.",
    "typicalError": "brougt",
    "capitalRequired": false
  },
  {
    "id": 58,
    "category": 3,
    "target": "fought",
    "ipa": "/fɔːt/",
    "note": "",
    "sentence": "The two brothers fought over the last mango.",
    "typicalError": "faught",
    "capitalRequired": false
  },
  {
    "id": 59,
    "category": 3,
    "target": "eight",
    "ipa": "/eɪt/",
    "note": "",
    "sentence": "The bus leaves at eight sharp.",
    "typicalError": "eigth",
    "capitalRequired": false
  },
  {
    "id": 60,
    "category": 3,
    "target": "freight",
    "ipa": "/freɪt/",
    "note": "",
    "sentence": "The freight train carried coal across the country.",
    "typicalError": "frieght",
    "capitalRequired": false
  },
  {
    "id": 61,
    "category": 4,
    "target": "believe",
    "ipa": "/bɪˈliːv/",
    "note": "",
    "sentence": "I believe that hard work always pays off.",
    "typicalError": "beleive",
    "capitalRequired": false
  },
  {
    "id": 62,
    "category": 4,
    "target": "friend",
    "ipa": "/frend/",
    "note": "",
    "sentence": "My best friend lives on the next street.",
    "typicalError": "freind",
    "capitalRequired": false
  },
  {
    "id": 63,
    "category": 4,
    "target": "receive",
    "ipa": "/rɪˈsiːv/",
    "note": "",
    "sentence": "You will receive your certificate on Monday.",
    "typicalError": "recieve",
    "capitalRequired": false
  },
  {
    "id": 64,
    "category": 4,
    "target": "people",
    "ipa": "/ˈpiːpl/",
    "note": "",
    "sentence": "Thousands of people lined the road to cheer the runners.",
    "typicalError": "peaple",
    "capitalRequired": false
  },
  {
    "id": 65,
    "category": 4,
    "target": "beautiful",
    "ipa": "/ˈbjuːtɪfl/",
    "note": "",
    "sentence": "What a beautiful sunset over the river!",
    "typicalError": "beutiful",
    "capitalRequired": false
  },
  {
    "id": 66,
    "category": 4,
    "target": "necessary",
    "ipa": "/ˈnesəsəri/",
    "note": "",
    "sentence": "It is necessary to wear a helmet when you ride a bicycle.",
    "typicalError": "neccessary",
    "capitalRequired": false
  },
  {
    "id": 67,
    "category": 4,
    "target": "accommodate",
    "ipa": "/əˈkɒmədeɪt/",
    "note": "",
    "sentence": "The new hall can accommodate five hundred guests.",
    "typicalError": "accomodate",
    "capitalRequired": false
  },
  {
    "id": 68,
    "category": 4,
    "target": "embarrass",
    "ipa": "/ɪmˈbærəs/",
    "note": "",
    "sentence": "Do not embarrass me in front of the whole class.",
    "typicalError": "embarass",
    "capitalRequired": false
  },
  {
    "id": 69,
    "category": 4,
    "target": "occasion",
    "ipa": "/əˈkeɪʒn/",
    "note": "",
    "sentence": "Graduation is a special occasion for students and parents.",
    "typicalError": "occassion",
    "capitalRequired": false
  },
  {
    "id": 70,
    "category": 4,
    "target": "disappear",
    "ipa": "/ˌdɪsəˈpɪə(r)/",
    "note": "",
    "sentence": "Magicians can make a coin disappear in seconds.",
    "typicalError": "dissapear",
    "capitalRequired": false
  },
  {
    "id": 71,
    "category": 4,
    "target": "occurred",
    "ipa": "/əˈkɜːd/",
    "note": "",
    "sentence": "The accident occurred just before midday.",
    "typicalError": "occured",
    "capitalRequired": false
  },
  {
    "id": 72,
    "category": 4,
    "target": "beginning",
    "ipa": "/bɪˈɡɪnɪŋ/",
    "note": "",
    "sentence": "The beginning of the film was rather slow.",
    "typicalError": "begining",
    "capitalRequired": false
  },
  {
    "id": 73,
    "category": 4,
    "target": "achieve",
    "ipa": "/əˈtʃiːv/",
    "note": "",
    "sentence": "With patience, you can achieve great things.",
    "typicalError": "acheive",
    "capitalRequired": false
  },
  {
    "id": 74,
    "category": 4,
    "target": "relief",
    "ipa": "/rɪˈliːf/",
    "note": "",
    "sentence": "It was such a relief to hear that she was safe.",
    "typicalError": "releif",
    "capitalRequired": false
  },
  {
    "id": 75,
    "category": 4,
    "target": "ceiling",
    "ipa": "/ˈsiːlɪŋ/",
    "note": "",
    "sentence": "A large fan hangs from the ceiling.",
    "typicalError": "cieling",
    "capitalRequired": false
  },
  {
    "id": 76,
    "category": 4,
    "target": "deceive",
    "ipa": "/dɪˈsiːv/",
    "note": "",
    "sentence": "Do not try to deceive your teacher.",
    "typicalError": "decieve",
    "capitalRequired": false
  },
  {
    "id": 77,
    "category": 4,
    "target": "niece",
    "ipa": "/niːs/",
    "note": "",
    "sentence": "My niece is learning to ride a bicycle.",
    "typicalError": "neice",
    "capitalRequired": false
  },
  {
    "id": 78,
    "category": 4,
    "target": "thief",
    "ipa": "/θiːf/",
    "note": "",
    "sentence": "The thief ran down the alley and vanished.",
    "typicalError": "theif",
    "capitalRequired": false
  },
  {
    "id": 79,
    "category": 4,
    "target": "chief",
    "ipa": "/tʃiːf/",
    "note": "",
    "sentence": "The chief of the village welcomed the visitors.",
    "typicalError": "cheif",
    "capitalRequired": false
  },
  {
    "id": 80,
    "category": 4,
    "target": "grief",
    "ipa": "/ɡriːf/",
    "note": "",
    "sentence": "The whole town shared her grief after the loss.",
    "typicalError": "greif",
    "capitalRequired": false
  },
  {
    "id": 81,
    "category": 5,
    "target": "said",
    "ipa": "/sed/",
    "note": "",
    "sentence": "He said the shop was closed.",
    "typicalError": "sed",
    "capitalRequired": false
  },
  {
    "id": 82,
    "category": 5,
    "target": "does",
    "ipa": "/dʌz/",
    "note": "",
    "sentence": "He does his homework before dinner.",
    "typicalError": "duz",
    "capitalRequired": false
  },
  {
    "id": 83,
    "category": 5,
    "target": "because",
    "ipa": "/bɪˈkɒz/",
    "note": "",
    "sentence": "We stayed indoors because it was raining.",
    "typicalError": "becuase",
    "capitalRequired": false
  },
  {
    "id": 84,
    "category": 5,
    "target": "definitely",
    "ipa": "/ˈdefɪnətli/",
    "note": "",
    "sentence": "I will definitely visit you next week.",
    "typicalError": "definately",
    "capitalRequired": false
  },
  {
    "id": 85,
    "category": 5,
    "target": "probably",
    "ipa": "/ˈprɒbəbli/",
    "note": "",
    "sentence": "It will probably rain this afternoon.",
    "typicalError": "probaly",
    "capitalRequired": false
  },
  {
    "id": 86,
    "category": 5,
    "target": "actually",
    "ipa": "/ˈæktʃuəli/",
    "note": "",
    "sentence": "Actually, the exam was easier than I expected.",
    "typicalError": "actualy",
    "capitalRequired": false
  },
  {
    "id": 87,
    "category": 5,
    "target": "really",
    "ipa": "/ˈriːəli/",
    "note": "",
    "sentence": "She was really pleased with her results.",
    "typicalError": "realy",
    "capitalRequired": false
  },
  {
    "id": 88,
    "category": 5,
    "target": "February",
    "ipa": "/ˈfebruəri/",
    "note": "",
    "sentence": "My birthday is in February, the shortest month of the year.",
    "typicalError": "Febuary",
    "capitalRequired": true
  },
  {
    "id": 89,
    "category": 5,
    "target": "Wednesday",
    "ipa": "/ˈwenzdeɪ/",
    "note": "",
    "sentence": "We have a football match on Wednesday.",
    "typicalError": "Wensday",
    "capitalRequired": true
  },
  {
    "id": 90,
    "category": 5,
    "target": "government",
    "ipa": "/ˈɡʌvənmənt/",
    "note": "",
    "sentence": "The government built a new bridge across the river.",
    "typicalError": "goverment",
    "capitalRequired": false
  },
  {
    "id": 91,
    "category": 5,
    "target": "important",
    "ipa": "/ɪmˈpɔːtnt/",
    "note": "",
    "sentence": "It is important to drink clean water.",
    "typicalError": "importent",
    "capitalRequired": false
  },
  {
    "id": 92,
    "category": 5,
    "target": "especially",
    "ipa": "/ɪˈspeʃəli/",
    "note": "",
    "sentence": "I love fruit, especially ripe mangoes.",
    "typicalError": "expecially",
    "capitalRequired": false
  },
  {
    "id": 93,
    "category": 5,
    "target": "particularly",
    "ipa": "/pəˈtɪkjələli/",
    "note": "",
    "sentence": "The soup was particularly tasty today.",
    "typicalError": "particulary",
    "capitalRequired": false
  },
  {
    "id": 94,
    "category": 5,
    "target": "quiet",
    "ipa": "/ˈkwaɪət/",
    "note": "",
    "sentence": "Please keep the room quiet while others are reading.",
    "typicalError": "quiat",
    "capitalRequired": false
  },
  {
    "id": 95,
    "category": 5,
    "target": "quite",
    "ipa": "/kwaɪt/",
    "note": "",
    "sentence": "The film was quite long, but I enjoyed it.",
    "typicalError": "quitte",
    "capitalRequired": false
  },
  {
    "id": 96,
    "category": 5,
    "target": "whether",
    "ipa": "/ˈweðə(r)/",
    "note": "",
    "sentence": "I cannot decide whether to walk or take the bus.",
    "typicalError": "wheter",
    "capitalRequired": false
  },
  {
    "id": 97,
    "category": 5,
    "target": "weather",
    "ipa": "/ˈweðə(r)/",
    "note": "",
    "sentence": "The weather was hot and dry all week.",
    "typicalError": "wheather",
    "capitalRequired": false
  },
  {
    "id": 98,
    "category": 5,
    "target": "breakfast",
    "ipa": "/ˈbrekfəst/",
    "note": "",
    "sentence": "She had bread and eggs for breakfast.",
    "typicalError": "brekfast",
    "capitalRequired": false
  },
  {
    "id": 99,
    "category": 5,
    "target": "minute",
    "ipa": "/ˈmɪnɪt/",
    "note": "noun",
    "sentence": "Please wait a minute while I find my keys.",
    "typicalError": "minit",
    "capitalRequired": false
  },
  {
    "id": 100,
    "category": 5,
    "target": "threw",
    "ipa": "/θruː/",
    "note": "",
    "sentence": "He threw the ball over the fence.",
    "typicalError": "thrue",
    "capitalRequired": false
  },
  {
    "id": 101,
    "category": 6,
    "target": "colour",
    "ipa": "/ˈkʌlə(r)/",
    "note": "",
    "sentence": "What colour is your new school bag?",
    "typicalError": "color",
    "capitalRequired": false
  },
  {
    "id": 102,
    "category": 6,
    "target": "favourite",
    "ipa": "/ˈfeɪvərɪt/",
    "note": "",
    "sentence": "Jollof rice is my favourite meal.",
    "typicalError": "favorite",
    "capitalRequired": false
  },
  {
    "id": 103,
    "category": 6,
    "target": "humour",
    "ipa": "/ˈhjuːmə(r)/",
    "note": "",
    "sentence": "Her sense of humour makes everyone smile.",
    "typicalError": "humor",
    "capitalRequired": false
  },
  {
    "id": 104,
    "category": 6,
    "target": "centre",
    "ipa": "/ˈsentə(r)/",
    "note": "",
    "sentence": "The market is in the centre of the town.",
    "typicalError": "center",
    "capitalRequired": false
  },
  {
    "id": 105,
    "category": 6,
    "target": "travelling",
    "ipa": "/ˈtrævəlɪŋ/",
    "note": "",
    "sentence": "They are travelling to the coast by train.",
    "typicalError": "traveling",
    "capitalRequired": false
  },
  {
    "id": 106,
    "category": 6,
    "target": "organise",
    "ipa": "/ˈɔːɡənaɪz/",
    "note": "",
    "sentence": "We will organise a cleaning day at school.",
    "typicalError": "organize",
    "capitalRequired": false
  },
  {
    "id": 107,
    "category": 6,
    "target": "realise",
    "ipa": "/ˈrɪəlaɪz/",
    "note": "",
    "sentence": "Some people do not realise how much sleep matters.",
    "typicalError": "realize",
    "capitalRequired": false
  },
  {
    "id": 108,
    "category": 6,
    "target": "honour",
    "ipa": "/ˈɒnə(r)/",
    "note": "",
    "sentence": "It is an honour to meet you.",
    "typicalError": "honor",
    "capitalRequired": false
  },
  {
    "id": 109,
    "category": 6,
    "target": "labour",
    "ipa": "/ˈleɪbə(r)/",
    "note": "",
    "sentence": "Hard labour under the hot sun tired the workers.",
    "typicalError": "labor",
    "capitalRequired": false
  },
  {
    "id": 110,
    "category": 6,
    "target": "theatre",
    "ipa": "/ˈθɪətə(r)/",
    "note": "",
    "sentence": "We watched a play at the theatre on Saturday.",
    "typicalError": "theater",
    "capitalRequired": false
  },
  {
    "id": 111,
    "category": 6,
    "target": "metre",
    "ipa": "/ˈmiːtə(r)/",
    "note": "",
    "sentence": "The table is one metre long.",
    "typicalError": "meter",
    "capitalRequired": false
  },
  {
    "id": 112,
    "category": 6,
    "target": "programme",
    "ipa": "/ˈprəʊɡræm/",
    "note": "",
    "sentence": "The programme starts at seven in the evening.",
    "typicalError": "program",
    "capitalRequired": false
  },
  {
    "id": 113,
    "category": 6,
    "target": "cheque",
    "ipa": "/tʃek/",
    "note": "",
    "sentence": "He paid the school fees with a cheque.",
    "typicalError": "check",
    "capitalRequired": false
  },
  {
    "id": 114,
    "category": 6,
    "target": "jewellery",
    "ipa": "/ˈdʒuːəlri/",
    "note": "",
    "sentence": "She keeps her gold jewellery in a small box.",
    "typicalError": "jewelry",
    "capitalRequired": false
  },
  {
    "id": 115,
    "category": 6,
    "target": "practise",
    "ipa": "/ˈpræktɪs/",
    "note": "verb",
    "sentence": "I practise the piano for an hour after school.",
    "typicalError": "practice",
    "capitalRequired": false
  },
  {
    "id": 116,
    "category": 6,
    "target": "defence",
    "ipa": "/dɪˈfens/",
    "note": "",
    "sentence": "Their strong defence stopped the attack.",
    "typicalError": "defense",
    "capitalRequired": false
  },
  {
    "id": 117,
    "category": 6,
    "target": "licence",
    "ipa": "/ˈlaɪsns/",
    "note": "noun",
    "sentence": "You need a licence to drive a car.",
    "typicalError": "license",
    "capitalRequired": false
  },
  {
    "id": 118,
    "category": 6,
    "target": "offence",
    "ipa": "/əˈfens/",
    "note": "",
    "sentence": "Stealing is a serious offence.",
    "typicalError": "offense",
    "capitalRequired": false
  },
  {
    "id": 119,
    "category": 6,
    "target": "analyse",
    "ipa": "/ˈænəlaɪz/",
    "note": "",
    "sentence": "Scientists analyse the water to check that it is safe.",
    "typicalError": "analyze",
    "capitalRequired": false
  },
  {
    "id": 120,
    "category": 6,
    "target": "apologise",
    "ipa": "/əˈpɒlədʒaɪz/",
    "note": "",
    "sentence": "I must apologise for arriving late.",
    "typicalError": "apologize",
    "capitalRequired": false
  }
];

/** The 6 Activity B story chapters, in order. */
export const STORY_CHAPTERS: StoryChapter[] = [
  {
    "chapter": 1,
    "title": "The Storeroom",
    "paragraphs": [
      [
        {
          "type": "text",
          "value": "Kemi lived above her parents' small "
        },
        {
          "type": "gap",
          "id": 10,
          "word": "restaurant"
        },
        {
          "type": "text",
          "value": " in Ibadan, and the smell of fried plantain floated up the stairs "
        },
        {
          "type": "gap",
          "id": 1,
          "word": "every"
        },
        {
          "type": "text",
          "value": " morning. Her "
        },
        {
          "type": "gap",
          "id": 12,
          "word": "family"
        },
        {
          "type": "text",
          "value": " had run the "
        },
        {
          "type": "gap",
          "id": 5,
          "word": "business"
        },
        {
          "type": "text",
          "value": " for thirty years, and the storeroom at the back was full of old secrets. One rainy Saturday, her grandfather asked her to help him clear it out."
        }
      ],
      [
        {
          "type": "text",
          "value": "\"Mind the boxes,\" he warned. \"They are "
        },
        {
          "type": "gap",
          "id": 2,
          "word": "heavy"
        },
        {
          "type": "text",
          "value": ", and I do not want you to get "
        },
        {
          "type": "gap",
          "id": 3,
          "word": "hurt"
        },
        {
          "type": "text",
          "value": ".\""
        }
      ],
      [
        {
          "type": "text",
          "value": "Kemi pushed "
        },
        {
          "type": "gap",
          "id": 18,
          "word": "several"
        },
        {
          "type": "text",
          "value": " crates aside. She found tins of "
        },
        {
          "type": "gap",
          "id": 7,
          "word": "chocolate"
        },
        {
          "type": "text",
          "value": " powder, sacks of beans, and a basket of wilted "
        },
        {
          "type": "gap",
          "id": 8,
          "word": "vegetable"
        },
        {
          "type": "text",
          "value": " leaves that needed throwing away. The "
        },
        {
          "type": "gap",
          "id": 14,
          "word": "temperature"
        },
        {
          "type": "text",
          "value": " in the little room was so high that her shirt stuck to her back."
        }
      ],
      [
        {
          "type": "text",
          "value": "Her grandfather sat on a wooden stool and pointed to a "
        },
        {
          "type": "gap",
          "id": 13,
          "word": "separate"
        },
        {
          "type": "text",
          "value": " shelf beside the door. On it lay a dusty leather case. Inside was an old "
        },
        {
          "type": "gap",
          "id": 16,
          "word": "camera"
        },
        {
          "type": "text",
          "value": ", black and silver, wrapped in a soft cloth. It felt strangely "
        },
        {
          "type": "gap",
          "id": 11,
          "word": "comfortable"
        },
        {
          "type": "text",
          "value": " in her hands."
        }
      ],
      [
        {
          "type": "text",
          "value": "\"You must "
        },
        {
          "type": "gap",
          "id": 4,
          "word": "listen"
        },
        {
          "type": "text",
          "value": " carefully,\" he whispered. \"My father took photographs of kings, teachers and even an army "
        },
        {
          "type": "gap",
          "id": 17,
          "word": "general"
        },
        {
          "type": "text",
          "value": ". An "
        },
        {
          "type": "gap",
          "id": 19,
          "word": "average"
        },
        {
          "type": "text",
          "value": " antique is worth very little, but this one holds a "
        },
        {
          "type": "gap",
          "id": 20,
          "word": "memory"
        },
        {
          "type": "text",
          "value": " that nobody has ever seen.\""
        }
      ],
      [
        {
          "type": "text",
          "value": "Kemi opened the back and found a roll of film that looked "
        },
        {
          "type": "gap",
          "id": 6,
          "word": "different"
        },
        {
          "type": "text",
          "value": " from any she had met before. She felt it was the most "
        },
        {
          "type": "gap",
          "id": 9,
          "word": "interesting"
        },
        {
          "type": "text",
          "value": " object in the whole house, and she wondered what "
        },
        {
          "type": "gap",
          "id": 15,
          "word": "history"
        },
        {
          "type": "text",
          "value": " it might hide."
        }
      ]
    ]
  },
  {
    "chapter": 2,
    "title": "The Map",
    "paragraphs": [
      [
        {
          "type": "text",
          "value": "Two days later, the man at the photo shop handed Kemi a small envelope. Inside was a print of a hand-drawn map. A tiny speck of land was marked with a cross, and beneath it someone had written in faded ink: \"Only an "
        },
        {
          "type": "gap",
          "id": 21,
          "word": "honest"
        },
        {
          "type": "text",
          "value": " heart may pass the "
        },
        {
          "type": "gap",
          "id": 22,
          "word": "guard"
        },
        {
          "type": "text",
          "value": ".\""
        }
      ],
      [
        {
          "type": "text",
          "value": "The note was signed by a "
        },
        {
          "type": "gap",
          "id": 33,
          "word": "foreign"
        },
        {
          "type": "text",
          "value": " traveller who had visited the coast one "
        },
        {
          "type": "gap",
          "id": 31,
          "word": "autumn"
        },
        {
          "type": "text",
          "value": " long ago. Kemi circled the day of the lowest tide on the kitchen "
        },
        {
          "type": "gap",
          "id": 24,
          "word": "calendar"
        },
        {
          "type": "text",
          "value": "."
        }
      ],
      [
        {
          "type": "text",
          "value": "Her brother Dayo studied the map beside her. \"It is only a riddle,\" he grumbled. \"I have "
        },
        {
          "type": "gap",
          "id": 25,
          "word": "half"
        },
        {
          "type": "text",
          "value": " a mind to ignore it. Nobody knows the "
        },
        {
          "type": "gap",
          "id": 23,
          "word": "answer"
        },
        {
          "type": "text",
          "value": ".\""
        }
      ],
      [
        {
          "type": "text",
          "value": "\"That is why we must go,\" Kemi replied. \"You "
        },
        {
          "type": "gap",
          "id": 28,
          "word": "should"
        },
        {
          "type": "text",
          "value": " be excited! If we find the treasure, Mum "
        },
        {
          "type": "gap",
          "id": 27,
          "word": "would"
        },
        {
          "type": "text",
          "value": " never worry about money again.\""
        }
      ],
      [
        {
          "type": "text",
          "value": "\"And how "
        },
        {
          "type": "gap",
          "id": 26,
          "word": "could"
        },
        {
          "type": "text",
          "value": " we even get there?\" asked Dayo."
        }
      ],
      [
        {
          "type": "text",
          "value": "On the day of the tide, their classmate Tola met them at the jetty with a torch and a bread "
        },
        {
          "type": "gap",
          "id": 29,
          "word": "knife"
        },
        {
          "type": "text",
          "value": ". The old fishermen began to "
        },
        {
          "type": "gap",
          "id": 32,
          "word": "condemn"
        },
        {
          "type": "text",
          "value": " the plan at once. \"Nobody goes to that "
        },
        {
          "type": "gap",
          "id": 30,
          "word": "island"
        },
        {
          "type": "text",
          "value": ",\" one of them growled. \"A "
        },
        {
          "type": "gap",
          "id": 34,
          "word": "ghost"
        },
        {
          "type": "text",
          "value": " haunts it.\""
        }
      ],
      [
        {
          "type": "text",
          "value": "They rowed across anyway. The shore was rocky and steep, and the three children had to "
        },
        {
          "type": "gap",
          "id": 35,
          "word": "climb"
        },
        {
          "type": "text",
          "value": " on their hands and knees. Kemi scraped her "
        },
        {
          "type": "gap",
          "id": 36,
          "word": "thumb"
        },
        {
          "type": "text",
          "value": ", and Dayo pulled a "
        },
        {
          "type": "gap",
          "id": 40,
          "word": "muscle"
        },
        {
          "type": "text",
          "value": " in his leg and groaned. At the top, partly buried in the sand, lay a rusty "
        },
        {
          "type": "gap",
          "id": 39,
          "word": "sword"
        },
        {
          "type": "text",
          "value": ". Beside it were an ivory "
        },
        {
          "type": "gap",
          "id": 37,
          "word": "comb"
        },
        {
          "type": "text",
          "value": " and a silver bracelet that slid over Kemi's "
        },
        {
          "type": "gap",
          "id": 38,
          "word": "wrist"
        },
        {
          "type": "text",
          "value": " as if it had been waiting for her."
        }
      ]
    ]
  },
  {
    "chapter": 3,
    "title": "The Storm",
    "paragraphs": [
      [
        {
          "type": "text",
          "value": "They rowed back across the lagoon with the treasures wrapped in Tola's shirt. Then the sky turned black, and the water grew "
        },
        {
          "type": "gap",
          "id": 54,
          "word": "rough"
        },
        {
          "type": "text",
          "value": ". Waves rose to the "
        },
        {
          "type": "gap",
          "id": 48,
          "word": "height"
        },
        {
          "type": "text",
          "value": " of a door and slapped the little boat again and again. Dayo began to "
        },
        {
          "type": "gap",
          "id": 53,
          "word": "cough"
        },
        {
          "type": "text",
          "value": " as spray filled his mouth, and Tola tried to "
        },
        {
          "type": "gap",
          "id": 43,
          "word": "laugh"
        },
        {
          "type": "text",
          "value": " to hide her fear."
        }
      ],
      [
        {
          "type": "text",
          "value": "\"Keep the boat "
        },
        {
          "type": "gap",
          "id": 50,
          "word": "straight"
        },
        {
          "type": "text",
          "value": "!\" Kemi shouted, but the wind was "
        },
        {
          "type": "gap",
          "id": 55,
          "word": "tough"
        },
        {
          "type": "text",
          "value": " and the oars were slippery. She "
        },
        {
          "type": "gap",
          "id": 45,
          "word": "thought"
        },
        {
          "type": "text",
          "value": " her heart might burst. Suddenly a huge "
        },
        {
          "type": "gap",
          "id": 60,
          "word": "freight"
        },
        {
          "type": "text",
          "value": " ship loomed out of the rain, and its horn blared "
        },
        {
          "type": "gap",
          "id": 44,
          "word": "through"
        },
        {
          "type": "text",
          "value": " the storm."
        }
      ],
      [
        {
          "type": "text",
          "value": "A small fishing boat raced towards them. At the wheel stood Mr Bello, their "
        },
        {
          "type": "gap",
          "id": 47,
          "word": "neighbour"
        },
        {
          "type": "text",
          "value": ", with his "
        },
        {
          "type": "gap",
          "id": 46,
          "word": "daughter"
        },
        {
          "type": "text",
          "value": " beside him. He "
        },
        {
          "type": "gap",
          "id": 51,
          "word": "caught"
        },
        {
          "type": "text",
          "value": " the rope Kemi tossed and pulled them alongside. \"You have all "
        },
        {
          "type": "gap",
          "id": 58,
          "word": "fought"
        },
        {
          "type": "text",
          "value": " hard,\" he shouted, \"but the "
        },
        {
          "type": "gap",
          "id": 49,
          "word": "weight"
        },
        {
          "type": "text",
          "value": " of that wet bundle is dragging you down!\""
        }
      ],
      [
        {
          "type": "text",
          "value": "He "
        },
        {
          "type": "gap",
          "id": 57,
          "word": "brought"
        },
        {
          "type": "text",
          "value": " the children aboard and wrapped them in blankets. He had "
        },
        {
          "type": "gap",
          "id": 52,
          "word": "bought"
        },
        {
          "type": "text",
          "value": " the new engine only last week, and it was strong "
        },
        {
          "type": "gap",
          "id": 42,
          "word": "enough"
        },
        {
          "type": "text",
          "value": " to tow the rowing boat behind them. By the time they reached the shore it was only "
        },
        {
          "type": "gap",
          "id": 59,
          "word": "eight"
        },
        {
          "type": "text",
          "value": " o'clock. It felt like midnight, "
        },
        {
          "type": "gap",
          "id": 41,
          "word": "though"
        },
        {
          "type": "text",
          "value": "."
        }
      ],
      [
        {
          "type": "text",
          "value": "Back on land, Mr Bello gave each child a "
        },
        {
          "type": "gap",
          "id": 56,
          "word": "thorough"
        },
        {
          "type": "text",
          "value": " check for cuts and bruises."
        }
      ]
    ]
  },
  {
    "chapter": 4,
    "title": "The Old Palace",
    "paragraphs": [
      [
        {
          "type": "text",
          "value": "The next morning Kemi told her grandfather all about the voyage. He rubbed his beard and smiled. \"Come,\" he replied. \"We must take these treasures to the "
        },
        {
          "type": "gap",
          "id": 79,
          "word": "chief"
        },
        {
          "type": "text",
          "value": " at once.\""
        }
      ],
      [
        {
          "type": "text",
          "value": "The old palace had a hall so grand that it can "
        },
        {
          "type": "gap",
          "id": 67,
          "word": "accommodate"
        },
        {
          "type": "text",
          "value": " a thousand "
        },
        {
          "type": "gap",
          "id": 64,
          "word": "people"
        },
        {
          "type": "text",
          "value": ". Painted birds flew across the high "
        },
        {
          "type": "gap",
          "id": 75,
          "word": "ceiling"
        },
        {
          "type": "text",
          "value": ", and the ruler waited beneath them. He was Grandfather's oldest "
        },
        {
          "type": "gap",
          "id": 62,
          "word": "friend"
        },
        {
          "type": "text",
          "value": ". When Kemi laid the ancient treasures before him, he gazed at them in silence, and a tear ran down his cheek."
        }
      ],
      [
        {
          "type": "text",
          "value": "\"Years ago these treasures vanished,\" he whispered, \"and I felt such "
        },
        {
          "type": "gap",
          "id": 80,
          "word": "grief"
        },
        {
          "type": "text",
          "value": " that I lost my joy. Now I can hardly "
        },
        {
          "type": "gap",
          "id": 61,
          "word": "believe"
        },
        {
          "type": "text",
          "value": " my eyes. Today I "
        },
        {
          "type": "gap",
          "id": 63,
          "word": "receive"
        },
        {
          "type": "text",
          "value": " them back from the hands of a child.\""
        }
      ],
      [
        {
          "type": "text",
          "value": "He told them the whole tale. \"A "
        },
        {
          "type": "gap",
          "id": 78,
          "word": "thief"
        },
        {
          "type": "text",
          "value": " once crept into this hall and took them. He tried to "
        },
        {
          "type": "gap",
          "id": 76,
          "word": "deceive"
        },
        {
          "type": "text",
          "value": " us by claiming they had sunk into the sea. The crime "
        },
        {
          "type": "gap",
          "id": 71,
          "word": "occurred"
        },
        {
          "type": "text",
          "value": " on the wedding night of my "
        },
        {
          "type": "gap",
          "id": 77,
          "word": "niece"
        },
        {
          "type": "text",
          "value": ", and the treasures seemed to "
        },
        {
          "type": "gap",
          "id": 70,
          "word": "disappear"
        },
        {
          "type": "text",
          "value": " without a trace.\""
        }
      ],
      [
        {
          "type": "text",
          "value": "He touched the "
        },
        {
          "type": "gap",
          "id": 65,
          "word": "beautiful"
        },
        {
          "type": "text",
          "value": " silver bracelet on Kemi's arm and smiled. Dayo blinked hard, trying not to "
        },
        {
          "type": "gap",
          "id": 68,
          "word": "embarrass"
        },
        {
          "type": "text",
          "value": " himself in front of the crowd. Kemi let out a sigh of "
        },
        {
          "type": "gap",
          "id": 74,
          "word": "relief"
        },
        {
          "type": "text",
          "value": "."
        }
      ],
      [
        {
          "type": "text",
          "value": "\"This is only the "
        },
        {
          "type": "gap",
          "id": 72,
          "word": "beginning"
        },
        {
          "type": "text",
          "value": ",\" declared the ruler. \"Few children "
        },
        {
          "type": "gap",
          "id": 73,
          "word": "achieve"
        },
        {
          "type": "text",
          "value": " so much. A great feast is "
        },
        {
          "type": "gap",
          "id": 66,
          "word": "necessary"
        },
        {
          "type": "text",
          "value": " for such a special "
        },
        {
          "type": "gap",
          "id": 69,
          "word": "occasion"
        },
        {
          "type": "text",
          "value": "!\""
        }
      ]
    ]
  },
  {
    "chapter": 5,
    "title": "The News Spreads",
    "paragraphs": [
      [
        {
          "type": "text",
          "value": "News of the discovery spread "
        },
        {
          "type": "gap",
          "id": 95,
          "word": "quite"
        },
        {
          "type": "text",
          "value": " fast. By "
        },
        {
          "type": "gap",
          "id": 89,
          "word": "Wednesday"
        },
        {
          "type": "text",
          "value": ", reporters crowded the front door, and Kemi had to eat her "
        },
        {
          "type": "gap",
          "id": 98,
          "word": "breakfast"
        },
        {
          "type": "text",
          "value": " in a corner of the storeroom just to find a "
        },
        {
          "type": "gap",
          "id": 94,
          "word": "quiet"
        },
        {
          "type": "text",
          "value": " moment."
        }
      ],
      [
        {
          "type": "text",
          "value": "That afternoon, an official from the "
        },
        {
          "type": "gap",
          "id": 90,
          "word": "government"
        },
        {
          "type": "text",
          "value": " arrived. \"These treasures are "
        },
        {
          "type": "gap",
          "id": 91,
          "word": "important"
        },
        {
          "type": "text",
          "value": " to our whole country,\" she "
        },
        {
          "type": "gap",
          "id": 81,
          "word": "said"
        },
        {
          "type": "text",
          "value": ". \"They will go on show in a museum in "
        },
        {
          "type": "gap",
          "id": 88,
          "word": "February"
        },
        {
          "type": "text",
          "value": ".\""
        }
      ],
      [
        {
          "type": "text",
          "value": "Dayo "
        },
        {
          "type": "gap",
          "id": 100,
          "word": "threw"
        },
        {
          "type": "text",
          "value": " his cap in the air. \"It "
        },
        {
          "type": "gap",
          "id": 82,
          "word": "does"
        },
        {
          "type": "text",
          "value": " not seem real!\" he cried. Kemi was "
        },
        {
          "type": "gap",
          "id": 87,
          "word": "really"
        },
        {
          "type": "text",
          "value": " proud, "
        },
        {
          "type": "gap",
          "id": 93,
          "word": "particularly"
        },
        {
          "type": "text",
          "value": " of her brother, who had been so brave despite his sore leg. Grandfather was "
        },
        {
          "type": "gap",
          "id": 92,
          "word": "especially"
        },
        {
          "type": "text",
          "value": " pleased "
        },
        {
          "type": "gap",
          "id": 83,
          "word": "because"
        },
        {
          "type": "text",
          "value": " his father's old photographs had finally been seen."
        }
      ],
      [
        {
          "type": "text",
          "value": "\"It will "
        },
        {
          "type": "gap",
          "id": 84,
          "word": "definitely"
        },
        {
          "type": "text",
          "value": " be the best day of our lives,\" Tola announced."
        }
      ],
      [
        {
          "type": "text",
          "value": "\"Wait a "
        },
        {
          "type": "gap",
          "id": 99,
          "word": "minute"
        },
        {
          "type": "text",
          "value": ",\" Dayo remarked. \"We do not know "
        },
        {
          "type": "gap",
          "id": 96,
          "word": "whether"
        },
        {
          "type": "text",
          "value": " it will rain.\""
        }
      ],
      [
        {
          "type": "text",
          "value": "\"It is "
        },
        {
          "type": "gap",
          "id": 86,
          "word": "actually"
        },
        {
          "type": "text",
          "value": " the dry season,\" Kemi replied, \"so the "
        },
        {
          "type": "gap",
          "id": 97,
          "word": "weather"
        },
        {
          "type": "text",
          "value": " will "
        },
        {
          "type": "gap",
          "id": 85,
          "word": "probably"
        },
        {
          "type": "text",
          "value": " be perfect.\""
        }
      ]
    ]
  },
  {
    "chapter": 6,
    "title": "The Opening Day",
    "paragraphs": [
      [
        {
          "type": "text",
          "value": "On the day of the opening, the town "
        },
        {
          "type": "gap",
          "id": 104,
          "word": "centre"
        },
        {
          "type": "text",
          "value": " burst with "
        },
        {
          "type": "gap",
          "id": 101,
          "word": "colour"
        },
        {
          "type": "text",
          "value": ". Visitors "
        },
        {
          "type": "gap",
          "id": 105,
          "word": "travelling"
        },
        {
          "type": "text",
          "value": " from distant villages filled the streets, and drummers played Grandfather's "
        },
        {
          "type": "gap",
          "id": 102,
          "word": "favourite"
        },
        {
          "type": "text",
          "value": " songs. The "
        },
        {
          "type": "gap",
          "id": 112,
          "word": "programme"
        },
        {
          "type": "text",
          "value": " began at noon in the grand "
        },
        {
          "type": "gap",
          "id": 110,
          "word": "theatre"
        },
        {
          "type": "text",
          "value": ", where a stage stood a "
        },
        {
          "type": "gap",
          "id": 111,
          "word": "metre"
        },
        {
          "type": "text",
          "value": " above the floor."
        }
      ],
      [
        {
          "type": "text",
          "value": "Scientists had come to "
        },
        {
          "type": "gap",
          "id": 119,
          "word": "analyse"
        },
        {
          "type": "text",
          "value": " the old treasures, and after weeks of careful "
        },
        {
          "type": "gap",
          "id": 109,
          "word": "labour"
        },
        {
          "type": "text",
          "value": " they proved that they were over four hundred years old. Beside them, a glass case held ancient "
        },
        {
          "type": "gap",
          "id": 114,
          "word": "jewellery"
        },
        {
          "type": "text",
          "value": " from the same age. Kemi felt nervous, but she had learned to "
        },
        {
          "type": "gap",
          "id": 115,
          "word": "practise"
        },
        {
          "type": "text",
          "value": " her speech until it sounded smooth."
        }
      ],
      [
        {
          "type": "text",
          "value": "Dayo told a joke, and his sense of "
        },
        {
          "type": "gap",
          "id": 103,
          "word": "humour"
        },
        {
          "type": "text",
          "value": " made the whole crowd smile. Then the ruler handed Kemi a "
        },
        {
          "type": "gap",
          "id": 113,
          "word": "cheque"
        },
        {
          "type": "text",
          "value": " for a new school library. \"It is a great "
        },
        {
          "type": "gap",
          "id": 108,
          "word": "honour"
        },
        {
          "type": "text",
          "value": " to thank you,\" he announced."
        }
      ],
      [
        {
          "type": "text",
          "value": "Kemi began to "
        },
        {
          "type": "gap",
          "id": 107,
          "word": "realise"
        },
        {
          "type": "text",
          "value": " how much the adventure had changed her. The town council promised to "
        },
        {
          "type": "gap",
          "id": 106,
          "word": "organise"
        },
        {
          "type": "text",
          "value": " a festival each year."
        }
      ],
      [
        {
          "type": "text",
          "value": "At the back of the hall, Mr Bello stood with his head bowed. \"I carried you without a "
        },
        {
          "type": "gap",
          "id": 117,
          "word": "licence"
        },
        {
          "type": "text",
          "value": ",\" he admitted. \"That is an "
        },
        {
          "type": "gap",
          "id": 118,
          "word": "offence"
        },
        {
          "type": "text",
          "value": ", and I must "
        },
        {
          "type": "gap",
          "id": 120,
          "word": "apologise"
        },
        {
          "type": "text",
          "value": ".\""
        }
      ],
      [
        {
          "type": "text",
          "value": "Kemi stood and spoke in his "
        },
        {
          "type": "gap",
          "id": 116,
          "word": "defence"
        },
        {
          "type": "text",
          "value": ". \"You saved our lives,\" she replied. \"Nobody will punish you.\""
        }
      ],
      [
        {
          "type": "text",
          "value": "The crowd cheered, and Kemi smiled at Grandfather, who was wiping his eyes. Somewhere in that old roll of film, a new story was still waiting."
        }
      ]
    ]
  }
];

/** Total words / gaps in the challenge (120). */
export const WORD_VAULT_TOTAL_WORDS = DICTATION_ITEMS.length;
