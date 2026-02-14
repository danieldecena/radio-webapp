// ==============================================
// 93.4 ROM - DJ BREAKS CONFIG
// ==============================================

const STATION_CONFIG = {
  stationName: "93.4 ROM Radio",
  tagline: "Victoria's station for love",
  frequencyDisplay: "93.4 FM",
  partnerName: "Pauline",
  yourName: "Daniel",
  city: "Victoria",
  province: "BC",
};

// ============================================
// ROTATING TAGLINES (shown before song loads)
// ============================================
const STATION_TAGLINES = [
  "Playing the hits, dedicated to you",
  "Victoria's station for love",
  "Your love language is FM",
  "Where every song is for Pauline",
  "Broadcasting live from Daniel's heart",
  "More music, more Pauline, less everything else",
  "93.4 FM — Victoria BC",
  "Tune in. Stay in.",
  "Live from wherever you are",
  "The only station that really gets it",
];

// ============================================
// TIME-BASED CATEGORY WEIGHTS
// ============================================
const TIME_WEIGHTS = {
  morning:   { shoutouts: 4, weather: 3, traffic: 3, news: 1 },
  afternoon: { shoutouts: 4, weather: 2, traffic: 2, news: 2 },
  evening:   { shoutouts: 5, weather: 1, traffic: 1, news: 3 },
  latenight: { shoutouts: 4, news: 4, weather: 1, traffic: 1 },
};

function getWeightedCategory() {
  const hour = new Date().getHours();
  const period =
    hour >= 6  && hour < 12 ? 'morning'   :
    hour >= 12 && hour < 18 ? 'afternoon' :
    hour >= 18 && hour < 23 ? 'evening'   : 'latenight';
  const weights = TIME_WEIGHTS[period];
  const pool = [];
  for (const [cat, w] of Object.entries(weights)) {
    for (let i = 0; i < w; i++) pool.push(cat);
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

// ============================================
// SPECIAL DATE BREAKS  (key format: 'MM-DD')
// ============================================
const SPECIAL_DATES = {
  '06-25': [
    "Happy Birthday Pauline, from 93.4 ROM, Victoria BC. Daniel called in this morning to dedicate the entire station to you. We told him that's every day. He said today it's official.",
    "93.4 ROM Birthday Special. Pauline is celebrating today and Victoria is better for it. Nacho does not fully understand birthdays but he is present and that counts.",
    "It's June 25th on 93.4 ROM. Somewhere in Victoria, Pauline is having a birthday. Daniel has been ready for this day for months. This station has been ready since it was built.",
    "Birthday broadcast on 93.4 ROM. Pauline, you are funny and sweet and well-read and the reason this station exists. Happy Birthday. Daniel did not need a microphone to say that but we gave him one anyway.",
  ],
  '02-14': [
    "Happy Valentine's Day from 93.4 ROM. Daniel called in to dedicate the entire day to Pauline. We told him that's every day here. He said fair enough.",
    "93.4 ROM Valentine's Day special broadcast. The flowers are nice. The chocolates are fine. But this station runs all year. That's the real gift.",
    "It's February 14th on 93.4 ROM. Pauline, you are loved every day, but today Victoria officially agrees. The city has been fully informed.",
    "Valentine's Day on 93.4 ROM. Daniel submitted a formal dedication. It just said Pauline's name, seven times, in all caps. We aired it as written.",
  ],
  '01-01': [
    "Happy New Year from 93.4 ROM, Victoria BC. The year is new. The station is still dedicated to Pauline. Some things don't need to change.",
    "93.4 ROM ringing in the new year. Daniel's resolution is Pauline. Nacho's resolution is more naps. Both are fully achievable.",
  ],
  '12-25': [
    "Merry Christmas from 93.4 ROM. The best gift this station ever received was Pauline listening. Everything else is just bonus.",
    "93.4 ROM Christmas special. Victoria is quiet and beautiful today. Pauline makes it even more so. That is not a seasonal opinion. That is permanent.",
  ],
  '12-31': [
    "New Year's Eve on 93.4 ROM. The year had a lot of things in it. The best thing was Pauline. That is the official year-end review.",
    "93.4 ROM signing off on the year. Daniel's highlight reel is entirely Pauline. Nacho made a cameo. Strong year overall.",
  ],
  // Add anniversary: '03-15': [ "Happy anniversary..." ],
};

const DJ_BREAKS = {

  // ============================================
  // DJ SHOUTOUTS (60)
  // ============================================
  shoutouts: [
    "You're locked in to 93.4 ROM, Victoria's only station dedicated entirely to Pauline. Daniel made sure of that.",
    "That was a good one. This is 93.4 ROM, playing the hits and thinking about Pauline's laugh. Stay tuned.",
    "93.4 ROM, Victoria BC. If you're Pauline, this one's for you. If you're not Pauline, please hand the phone over.",
    "You're listening to 93.4 ROM. Daniel called in earlier and dedicated the entire rest of the day to Pauline. Respect.",
    "This is your boy on 93.4 ROM, Victoria's warmest station. Shoutout to Pauline, the girl with the best book recommendations in all of BC.",
    "93.4 ROM checking in. Nacho, if you're somehow listening, your mom is incredible and Daniel agrees.",
    "That was a banger. You're tuned into 93.4 ROM, where every song is hand picked by someone who really, really likes Pauline.",
    "Good to have you with us on 93.4 ROM. Scientists still can't explain how Pauline is so funny and so sweet at the same time. Research ongoing.",
    "You're locked in. 93.4 ROM, Victoria BC. The only radio station powered entirely by Daniel's feelings.",
    "This is 93.4 ROM. Pauline, wherever you are right now, Daniel wants you to know you look good today. That's not a guess, that's a fact.",
    "93.4 ROM in the building. Shoutout to the Sims building downtown Victoria, still standing, still iconic, still very much giving Sims 2 energy.",
    "You're tuned into 93.4 ROM. We play the hits, we think about Pauline, and occasionally Nacho walks across the broadcast desk.",
    "93.4 ROM, Victoria's most romantic station. Pauline has been named this station's official muse for the third year running. Congratulations.",
    "That was a certified classic. This is 93.4 ROM. Stay with us, more music and more Pauline appreciation coming right up.",
    "You're listening to 93.4 ROM. Daniel called in to say hi to Pauline. We told him to say it himself. He said this whole station counts.",
    "93.4 ROM checking in from Victoria BC. Raising Cane's has been notified that their number one fan is tuned in right now.",
    "This is 93.4 ROM. Pauline is funny, sweet, and owns a cat named Nacho. Victoria does not deserve her.",
    "You're on 93.4 ROM, the station that plays music between loving thoughts about Pauline. It's a niche format but it works.",
    "93.4 ROM live from Victoria. Shoutout to every book Pauline has ever read. You were in good hands.",
    "That was smooth. Almost as smooth as Pauline convincing Daniel to do whatever she wants. Almost.",
    "93.4 ROM in your ears. We asked Daniel what his favourite thing about Pauline is. He said everything and we had to cut him off.",
    "You're listening to 93.4 ROM. Nacho has been named this station's official mascot. No audition was needed.",
    "This is 93.4 ROM, Victoria BC. Pauline is out here being wonderful and the rest of us are just trying to keep up.",
    "93.4 ROM coming at you live. Someone very smart once said the best things in life are free. That someone was looking at Pauline.",
    "You're tuned in to 93.4 ROM. This station runs on good music and the energy Pauline brings into every room.",
    "93.4 ROM, your Victoria home. Daniel has submitted a formal request that this song be dedicated to Pauline. Request approved.",
    "This is 93.4 ROM. Pauline's laugh has been voted Victoria's best sound two years running. The ocean came in second.",
    "You're locked in to 93.4 ROM. Nacho was unavailable for comment but sources say he agrees Daniel is good people.",
    "93.4 ROM live and direct. Shoutout to Pauline for being the kind of person who makes ordinary days feel like something.",
    "That was a hit. This is 93.4 ROM where the only thing better than the music is knowing Pauline is listening.",
    "You're on 93.4 ROM, Victoria BC. Raising Cane's sauce deserves its own radio station but for now it settles for a shoutout.",
    "93.4 ROM checking in. Pauline picked up a book today and the rest of Victoria immediately felt less well-read.",
    "This is 93.4 ROM. Daniel has been a loyal listener since day one. Pauline is the reason he found the station.",
    "You're tuned into 93.4 ROM. We don't take requests but if we did, Daniel would have requested every song for Pauline.",
    "93.4 ROM live from the heart of Victoria. Nacho is curled up somewhere perfect right now. We're sure of it.",
    "That was beautiful. Almost as beautiful as Pauline mid-chapter, completely ignoring the world. Respect.",
    "You're listening to 93.4 ROM. This station was built for one person. You know who you are, Pauline.",
    "93.4 ROM in Victoria. Scientists have confirmed that Pauline being funny and sweet simultaneously defies known physics.",
    "This is 93.4 ROM. Shoutout to the Sims building for being so committed to the bit. We see you downtown.",
    "You're on 93.4 ROM. Daniel said to tell Pauline she's his favourite. We're not allowed to say who the runner up is.",
    "93.4 ROM, Victoria's warmest frequency. Pauline, you're doing amazing. This message is from Daniel and also from us.",
    "That was a good one. This is 93.4 ROM. Stay tuned for more music and one more reason Daniel thinks Pauline is everything.",
    "You're locked in to 93.4 ROM. Nacho doesn't know what a radio station is but he'd love this one.",
    "93.4 ROM live. Pauline reading a book is the most peaceful and intimidating sight in all of Victoria.",
    "This is 93.4 ROM. Daniel wanted to dedicate this next song to Pauline. We wanted to dedicate the whole station. We won.",
    "You're tuned into 93.4 ROM. Victoria's finest, broadcasting the kind of love that makes Nacho roll his eyes.",
    "93.4 ROM checking in. Raising Cane's should know they have a true champion in Pauline. Crown her already.",
    "That was smooth. This is 93.4 ROM. Stay right here because the next song is even better and Pauline deserves it.",
    "You're on 93.4 ROM, Victoria BC. The Sims building called in. It said it's flattered and hopes Pauline visits soon.",
    "93.4 ROM live. Shoutout to Pauline for being exactly the kind of person this station was made for.",
    "This is 93.4 ROM. Daniel is somewhere right now thinking about Pauline. This is not breaking news.",
    "You're listening to 93.4 ROM. Nacho is living his best life and Pauline made that possible. Legend behavior.",
    "93.4 ROM, Victoria. Every song on this station has been approved by someone who thinks Pauline has great taste.",
    "That was a hit. 93.4 ROM. We asked the Sims building for comment. It just stood there looking fictional.",
    "You're tuned into 93.4 ROM. Pauline, this station exists because Daniel wanted to give you something that lasts.",
    "93.4 ROM in your ears. Victoria is a beautiful city but it got a lot better when Pauline was in it.",
    "This is 93.4 ROM. Nacho walked across the broadcast desk again. We're not mad. We could never be mad at Nacho.",
    "You're on 93.4 ROM. Daniel called in to say he's lucky. We told him Pauline is luckier. He disagreed respectfully.",
    "93.4 ROM, Victoria's number one station for love, music, and occasional Nacho updates. Stay locked in.",
    "That was perfect. Just like Pauline. This is 93.4 ROM and we'll be right back after this.",
  ],

  // ============================================
  // WEATHER REPORTS (35)
  // ============================================
  weather: [
    "93.4 ROM weather update for Victoria BC. Expect a warm front moving in from wherever Pauline is right now. Temperatures feeling just right.",
    "Victoria weather on 93.4 ROM. Skies are partly cloudy over the Inner Harbour but completely clear in Pauline's vicinity. Enjoy it.",
    "Weather update from 93.4 ROM. Mild temperatures across Greater Victoria today. Daniel reports feeling warm regardless. Unrelated to the forecast.",
    "93.4 ROM weather. Expect light rain near Beacon Hill Park this afternoon, heavy sunshine wherever Pauline decides to show up.",
    "Victoria forecast on 93.4 ROM. Temperatures sitting at a comfortable 14 degrees. Pauline's presence adds approximately 6 degrees of warmth to any room.",
    "Weather on 93.4 ROM. The Juan de Fuca Strait is looking calm today. Much like Pauline mid-chapter. Do not disturb either.",
    "93.4 ROM Victoria weather. Overcast skies downtown near the Sims building. The building remains unbothered. It has seen worse.",
    "Weather update on 93.4 ROM. A sweet front is moving across Victoria from the east. Meteorologists believe Pauline may be responsible.",
    "Victoria forecast from 93.4 ROM. Expect comfortable highs of 16 degrees. Perfect weather for reading outside. Pauline, take note.",
    "93.4 ROM weather. Light winds across the Inner Harbour today. Nacho has been advised to stay indoors. He was already indoors. Good cat.",
    "Weather on 93.4 ROM. Rain expected near Mount Doug this evening. Cozy indoor weather. Perfect for books and Raising Cane's delivery.",
    "93.4 ROM Victoria forecast. Temperatures mild and manageable. The Sims building is experiencing its regular level of fictional energy. All clear.",
    "Weather update from 93.4 ROM. A warm front from the south is bringing comfortable temperatures to Victoria. Daniel called it. He said Pauline brought the warmth.",
    "93.4 ROM weather. Mostly sunny skies over downtown Victoria today. The Sims building is looking particularly simulated in this light.",
    "Victoria weather on 93.4 ROM. Expect a light breeze off the harbour this afternoon. Great weather for a walk with someone you love.",
    "93.4 ROM forecast. Temperatures holding steady at 15 degrees across Victoria. Pauline's laugh has been measured at significantly warmer.",
    "Weather on 93.4 ROM. Cloudy with a chance of coziness across Greater Victoria. Nacho has already claimed the warmest spot in the house.",
    "93.4 ROM Victoria weather. Clear skies expected through the evening. Perfect night for looking at the Sims building and wondering about its lore.",
    "Weather update on 93.4 ROM. Mild and pleasant across Victoria today. Conditions ideal for reading, cats, and Raising Cane's runs.",
    "93.4 ROM forecast for Victoria. A front of pure sweetness has settled over the city. Sources point to Pauline. No further investigation needed.",
    "Victoria weather from 93.4 ROM. Partly sunny with occasional clouds near the harbour. Daniel has declared it perfect weather regardless.",
    "93.4 ROM weather. Temperatures cool but comfortable downtown. The Sims building is holding up well. Structurally sound, aesthetically questionable.",
    "Weather on 93.4 ROM. Expect light showers near Beacon Hill this afternoon. Nacho is unbothered. Nacho is always unbothered.",
    "93.4 ROM Victoria forecast. Clear and calm across the city today. The kind of day Pauline would call perfect from behind a good book.",
    "Weather update from 93.4 ROM. A gentle warmth has settled over Victoria. Meteorologists confirmed it arrived the moment Pauline woke up.",
    "93.4 ROM weather. Mild temperatures and light winds across Greater Victoria. Great conditions for everything Pauline enjoys.",
    "Victoria weather on 93.4 ROM. Overcast skies but no rain expected. The Sims building looks especially mysterious in grey light. As intended.",
    "93.4 ROM forecast. Comfortable temperatures holding through the evening. Perfect weather for Nacho's extended nap schedule. He approves.",
    "Weather on 93.4 ROM. Sunny breaks expected over the Inner Harbour this afternoon. Daniel has requested Pauline enjoy them personally.",
    "93.4 ROM Victoria weather. A warm and funny front is moving through the city today. Pauline is suspected. Pauline is always suspected.",
    "Weather update on 93.4 ROM. Light rain near the Malahat this morning clearing by afternoon. Victoria doing what Victoria does.",
    "93.4 ROM forecast. Temperatures mild across the city. Good book weather. Raising Cane's weather. Nacho nap weather. Perfect day.",
    "Victoria weather from 93.4 ROM. Skies clearing over downtown this afternoon. The Sims building catching some light. Looking very expansion pack right now.",
    "93.4 ROM weather. A cozy front has settled over Greater Victoria. Sources confirm Nacho saw it coming and positioned himself accordingly.",
    "Weather on 93.4 ROM. Comfortable highs expected today across Victoria BC. Daniel says every day is a good day when it has Pauline in it. Meteorologists agree.",
  ],

  // ============================================
  // TRAFFIC REPORTS (35)
  // ============================================
  traffic: [
    "93.4 ROM traffic update. Douglas Street moving smoothly in both directions. Almost as smoothly as Pauline switches between funny and sweet. Almost.",
    "Traffic on 93.4 ROM. The Malahat is clear this morning. Conditions are perfect. Daniel would still rather stay wherever Pauline is.",
    "93.4 ROM traffic. Pat Bay Highway moving well in both directions. No delays unless you count Daniel taking the long way to see Pauline.",
    "Traffic update from 93.4 ROM. Johnson Street Bridge operating normally. Victoria's infrastructure remains solid. Unlike the Sims building which operates on vibes.",
    "93.4 ROM traffic. McKenzie Ave seeing light volume this hour. Smooth sailing across Greater Victoria. Nacho has been advised to avoid rush hour. He was already home.",
    "Traffic on 93.4 ROM. Douglas Street clear downtown. The Sims building area seeing normal foot traffic of people stopping to question its architecture.",
    "93.4 ROM traffic update. Pat Bay Highway moving at posted speeds. No incidents to report unless you count Daniel being down bad for Pauline. Ongoing situation.",
    "Traffic from 93.4 ROM. Inner Harbour area clear and accessible. Beautiful view today. Daniel recommends visiting it with Pauline specifically.",
    "93.4 ROM traffic. Malahat Drive clear in both directions this morning. Smooth conditions throughout. Nacho has no commute and continues to thrive.",
    "Traffic update on 93.4 ROM. McKenzie Ave and Douglas Street intersection moving well. Victoria roads cooperative today. Unlike Nacho who is on his own schedule.",
    "93.4 ROM traffic. Johnson Street Bridge clear with no delays. The Sims building nearby, standing confidently, existing in its own reality as always.",
    "Traffic on 93.4 ROM. Pat Bay Highway light this hour. If you're heading to Raising Cane's, all routes are clear. Pauline would call this good news.",
    "93.4 ROM traffic update. Douglas Street moving freely through downtown. The Sims building visible on the route. Worth a slow drive past.",
    "Traffic from 93.4 ROM. Greater Victoria roads quiet this afternoon. Good time to take a scenic drive. Better time to stay in with Pauline and a good book.",
    "93.4 ROM traffic. Malahat clear with no weather delays. Roads are cooperating today. Daniel is cooperating with whatever Pauline wants to do today.",
    "Traffic update on 93.4 ROM. Inner Harbour roads moving smoothly. Light pedestrian traffic near the waterfront. Peaceful Victoria afternoon in full effect.",
    "93.4 ROM traffic. McKenzie Ave clear through to Douglas Street. No issues reported. Nacho reported no issues either from his position on the couch.",
    "Traffic on 93.4 ROM. Johnson Street Bridge operating normally this evening. The Sims building lit up at night, looking more fictional than ever. Drive safe.",
    "93.4 ROM traffic update. Pat Bay Highway moving well northbound and southbound. No delays. Raising Cane's reachable within normal travel times. Good news for Pauline.",
    "Traffic from 93.4 ROM. Downtown Victoria roads clear this morning. The Sims building standing firm. Some things never change and we are grateful.",
    "93.4 ROM traffic. Douglas Street moving smoothly through the city core. Light volume expected through the afternoon. Daniel calls this ideal Pauline time.",
    "Traffic update on 93.4 ROM. Malahat Drive clear with good visibility. All major Victoria routes operating normally. Nacho has no travel plans. As expected.",
    "93.4 ROM traffic. Inner Harbour area accessible with no closures. Gorgeous out there today. Pauline should see it. Daniel is putting in the formal request now.",
    "Traffic on 93.4 ROM. McKenzie Ave moving at normal speeds this hour. Greater Victoria roads cooperating. The Sims building offering no traffic delays, only existential ones.",
    "93.4 ROM traffic update. Pat Bay Highway and Malahat both clear this morning. Good conditions throughout BC. Nacho remains stationary. Consistent as always.",
    "Traffic from 93.4 ROM. Johnson Street Bridge clear and open. Downtown Victoria accessible. The Sims building welcoming visitors who want to feel slightly confused.",
    "93.4 ROM traffic. Douglas Street light volume through downtown this afternoon. Easy driving conditions. Ideal for a Raising Cane's run for Pauline.",
    "Traffic update on 93.4 ROM. All major Victoria routes clear this evening. Beautiful night in the city. Made better by Pauline existing in it.",
    "93.4 ROM traffic. Malahat clear with no incidents. Pat Bay Highway moving well. Roads are good. Life is good. Pauline is great. 93.4 ROM.",
    "Traffic on 93.4 ROM. Inner Harbour roads and surrounding streets moving smoothly. Great evening in Victoria. Nacho is somewhere warm. Pauline is somewhere wonderful.",
    "93.4 ROM traffic update. McKenzie Ave through to Douglas moving freely. No delays reported. Daniel delayed only by wanting to stay with Pauline longer. Not a traffic issue.",
    "Traffic from 93.4 ROM. Johnson Street Bridge and downtown core clear this morning. The Sims building greeting commuters with its signature fictional energy.",
    "93.4 ROM traffic. Pat Bay Highway light northbound. Great conditions for travel. Even better conditions for staying in Victoria with Pauline and Nacho.",
    "Traffic update on 93.4 ROM. All Victoria routes operating normally. Roads smooth. Music good. Pauline listening. Daniel happy. 93.4 ROM, signing off on traffic.",
    "93.4 ROM traffic. Douglas Street, McKenzie Ave, and the Malahat all clear. Victoria roads are doing their part. Daniel is doing his part. Pauline makes it all worth it.",
  ],

  // ============================================
  // RELATIONSHIP NEWS (30)
  // ============================================
  news: [
    "Breaking news on 93.4 ROM. Local man Daniel continues to be extremely into Pauline. Experts say the situation shows no signs of changing. Developing story.",
    "93.4 ROM news update. Nacho was spotted this morning in his favourite spot. Sources confirm the spot belonged to Pauline first. Nacho does not care.",
    "News from 93.4 ROM. Pauline was seen reading today. Witnesses report she looked completely at peace. Daniel witnessed this. Daniel agreed.",
    "93.4 ROM breaking news. Raising Cane's Victoria has confirmed Pauline remains one of their most appreciated customers. The sauce knows.",
    "News update on 93.4 ROM. The Sims building downtown Victoria was visited today. It still looks like it belongs in a loading screen. No updates on that front.",
    "93.4 ROM news. Sources close to Daniel confirm he thought about Pauline today. Sources also confirm this is not news. This happens every day.",
    "Breaking on 93.4 ROM. Nacho has once again claimed the softest blanket in the house. Pauline let him. Daniel is not surprised. Nobody is surprised.",
    "93.4 ROM news update. Pauline laughed today and reportedly made everyone around her immediately happier. Investigation into how she does this remains open.",
    "News from 93.4 ROM. Local couple Daniel and Pauline spotted being cute in Victoria. Witnesses described it as, quote, a lot. In the best way.",
    "93.4 ROM breaking news. Raising Cane's has been informed that their biggest Victoria supporter is currently tuned into 93.4 ROM. They are honoured.",
    "News update on 93.4 ROM. Nacho has filed no complaints today. This is either because everything is perfect or because Nacho handles things internally.",
    "93.4 ROM news. Pauline finished a book today. Victoria's overall intelligence level rose measurably. Daniel was not surprised. He knows who he's with.",
    "Breaking on 93.4 ROM. The Sims building has once again been spotted looking aggressively fictional. Downtown Victoria unfazed. Pauline delighted.",
    "93.4 ROM news update. Daniel has confirmed that today was a good day. When asked why, he mentioned Pauline. When asked for more detail, he just said Pauline again.",
    "News from 93.4 ROM. Nacho was observed today making a very deliberate choice about where to sit. He chose Pauline's side. Smart cat. Excellent taste.",
    "93.4 ROM breaking news. Local sources confirm Pauline is funny, sweet, well-read, and extremely good at choosing chicken. Victoria considers itself lucky.",
    "News update on 93.4 ROM. The Sims building issued a statement today. The statement was just its facade. It spoke volumes. Pauline translated it perfectly.",
    "93.4 ROM news. Raising Cane's sauce continues to be excellent. Pauline continues to know this. The rest of Victoria is catching up slowly.",
    "Breaking on 93.4 ROM. Scientists studying the phenomenon of Pauline being both hilarious and sweet have requested more funding. Research is ongoing.",
    "93.4 ROM news update. Nacho was found napping today in a position that defied physics. Pauline documented it. The photo was sent to Daniel immediately.",
    "News from 93.4 ROM. Daniel would like Victoria to know that Pauline is his favourite person. Victoria has acknowledged this. Nacho had no comment.",
    "93.4 ROM breaking news. A new chapter has been started by Pauline somewhere in Victoria right now. The book is lucky. Daniel is luckier.",
    "News update on 93.4 ROM. The Sims building was seen this evening looking especially built-by-a-player-with-no-architecture-degree. Pauline called it from the start.",
    "93.4 ROM news. Sources confirm Nacho has been fed, loved, and given optimal napping conditions. Pauline is responsible. Nacho accepts this as his due.",
    "Breaking on 93.4 ROM. Pauline was funny today. Then sweet. Then funny again. Daniel did not know how to handle it. He handled it by smiling a lot.",
    "93.4 ROM news update. Raising Cane's Victoria has been officially recognized as a cornerstone of Pauline's happiness. The station stands behind this.",
    "News from 93.4 ROM. Daniel and Pauline's story continues to be one of Victoria's best kept secrets. 93.4 ROM is happy to report on it.",
    "93.4 ROM breaking news. Nacho knocked something over today. There were no witnesses but Pauline knows it was him. Nacho maintains his innocence.",
    "News update on 93.4 ROM. The Sims building has been standing in Victoria long enough to become a landmark. Pauline named it. The name stuck. It always will.",
    "93.4 ROM final news update of the hour. Daniel made this station for Pauline because some feelings are too big for a text message. This is 93.4 ROM. Stay tuned.",
  ],

};

// ============================================
// HELPER FUNCTIONS
// ============================================
function getRandomBreak(category) {
  const breaks = DJ_BREAKS[category];
  return breaks[Math.floor(Math.random() * breaks.length)];
}

function getAnyRandomBreak() {
  const categories = Object.keys(DJ_BREAKS);
  const randomCategory = categories[Math.floor(Math.random() * categories.length)];
  return getRandomBreak(randomCategory);
}

export {
  STATION_CONFIG,
  DJ_BREAKS,
  STATION_TAGLINES,
  SPECIAL_DATES,
  TIME_WEIGHTS,
  getRandomBreak,
  getAnyRandomBreak,
  getWeightedCategory,
};
