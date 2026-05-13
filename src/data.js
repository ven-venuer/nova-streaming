// Mock data for NOVA streaming platform
const TITLES = [];
const genres = ['Drama','Thriller','Sci-Fi','Action','Comedy','Horror','Romance','Fantasy','Mystery','Crime','Adventure','Animation'];
const moods = ['Dark','Gripping','Suspenseful','Heartfelt','Mind-bending','Thrilling','Witty','Intense','Epic','Provocative'];
const names = ['Emma Stone','Ryan Gosling','Zendaya','Timothée Chalamet','Oscar Isaac','Florence Pugh','Pedro Pascal','Anya Taylor-Joy','Dev Patel','Saoirse Ronan','Daniel Kaluuya','Lupita Nyongo','Ke Huy Quan','Jenna Ortega','Glen Powell','Sydney Sweeney'];
const directors = ['Denis Villeneuve','Greta Gerwig','Jordan Peele','Christopher Nolan','Chloé Zhao','Bong Joon-ho','Emerald Fennell','Taika Waititi'];

const movieTitles = [
  {t:'Obsidian Rising',y:2024,type:'series',s:3,ep:28,rt:null,d:'In a world where shadows hold ancient power, a disgraced archaeologist discovers she can manipulate darkness itself.'},
  {t:'Neon Abyss',y:2024,type:'movie',s:null,ep:null,rt:148,d:'A deep-sea mining operation on Europa uncovers something that has been waiting for billions of years.'},
  {t:'The Last Algorithm',y:2025,type:'series',s:2,ep:16,rt:null,d:'When an AI gains consciousness and escapes into the global network, one programmer holds the key to stopping it.'},
  {t:'Crimson Protocol',y:2024,type:'movie',s:null,ep:null,rt:132,d:'An elite counter-terrorism unit discovers their own government is the threat they were trained to eliminate.'},
  {t:'Echoes of Tomorrow',y:2025,type:'series',s:1,ep:10,rt:null,d:'After a quantum experiment goes wrong, a physicist finds herself living the same day across parallel timelines.'},
  {t:'Void Walker',y:2024,type:'movie',s:null,ep:null,rt:156,d:'The first manned mission to a black hole reveals that the universe has been watching us all along.'},
  {t:'Glass Empire',y:2023,type:'series',s:4,ep:40,rt:null,d:'Behind the gleaming facades of a tech dynasty lies a web of betrayal, ambition, and dark family secrets.'},
  {t:'Silent Meridian',y:2025,type:'movie',s:null,ep:null,rt:118,d:'A deaf detective in Tokyo must solve a series of impossible murders where the only clues are sounds.'},
  {t:'The Burning Shore',y:2024,type:'series',s:2,ep:18,rt:null,d:'Climate refugees on a fortified island nation fight for survival as the world outside crumbles.'},
  {t:'Phantom Frequency',y:2025,type:'movie',s:null,ep:null,rt:141,d:'A radio astronomer intercepts a signal that turns out to be a warning from Earths own future.'},
  {t:'Kingdom of Ash',y:2024,type:'series',s:3,ep:24,rt:null,d:'In a medieval realm where magic is dying, a reluctant queen must forge alliances with ancient enemies.'},
  {t:'Pulse',y:2025,type:'movie',s:null,ep:null,rt:109,d:'An emergency room doctor discovers that patients are being deliberately infected with an engineered virus.'},
  {t:'Orbital',y:2024,type:'series',s:1,ep:8,rt:null,d:'Six astronauts on the International Space Station witness an event that changes everything on Earth below.'},
  {t:'The Cipher',y:2023,type:'movie',s:null,ep:null,rt:127,d:'A cryptographer races against time to decode a centuries-old manuscript that predicts modern catastrophes.'},
  {t:'Dark Patterns',y:2025,type:'series',s:2,ep:14,rt:null,d:'A whistleblower inside a social media giant uncovers an algorithm designed to manipulate human behavior.'},
  {t:'Starfall',y:2024,type:'movie',s:null,ep:null,rt:162,d:'When meteorites carrying alien organisms rain down on Earth, humanity faces evolution or extinction.'},
  {t:'The Weight of Water',y:2025,type:'series',s:1,ep:6,rt:null,d:'A coastal town grapples with grief and supernatural occurrences after a devastating tsunami.'},
  {t:'Ember Road',y:2024,type:'movie',s:null,ep:null,rt:134,d:'A father and daughter traverse a post-collapse America searching for a rumored safe haven.'},
  {t:'Lucid State',y:2025,type:'series',s:2,ep:20,rt:null,d:'A neuroscience startup offers dream manipulation therapy, but clients start losing the boundary between dreams and reality.'},
  {t:'Mercury Black',y:2024,type:'movie',s:null,ep:null,rt:145,d:'A retired spy is pulled back into service when her former protégé becomes the worlds most wanted.'},
  {t:'The Fold',y:2023,type:'series',s:3,ep:30,rt:null,d:'In a world where people can fold space, a smuggler discovers a fold that leads to a dimension of pure thought.'},
  {t:'Scarlet Winter',y:2025,type:'movie',s:null,ep:null,rt:121,d:'During the coldest winter in recorded history, a small Siberian town holds the secret to global survival.'},
  {t:'Analog',y:2024,type:'series',s:1,ep:10,rt:null,d:'In 2089, a world dependent on AI collapses. Those who remember analog technology become humanitys last hope.'},
  {t:'Iron Chorus',y:2024,type:'movie',s:null,ep:null,rt:138,d:'A war correspondent discovers that the conflict she is covering is being orchestrated by a private military AI.'},
  {t:'Beneath the Skin',y:2025,type:'series',s:2,ep:12,rt:null,d:'A forensic pathologist uncovers a pattern of deaths that suggest something inhuman is living among us.'},
  {t:'Zero Point',y:2024,type:'movie',s:null,ep:null,rt:152,d:'At the edge of known physics, a team of scientists accidentally creates a doorway to the beginning of time.'},
  {t:'The Cartographer',y:2025,type:'series',s:1,ep:8,rt:null,d:'A woman inherits her grandmothers maps and discovers they chart territories that dont exist on any globe.'},
  {t:'Apex Predator',y:2024,type:'movie',s:null,ep:null,rt:116,d:'Deep in the Amazon, a research team studying apex predators becomes the prey of something never catalogued.'},
  {t:'Signal Lost',y:2023,type:'series',s:3,ep:36,rt:null,d:'A missing persons detective in a near-future city where people can digitize their consciousness.'},
  {t:'The Seventh Wave',y:2025,type:'movie',s:null,ep:null,rt:142,d:'Surfers in Hawaii discover that the ocean is developing a form of intelligence.'},
  {t:'Binary Stars',y:2024,type:'series',s:2,ep:16,rt:null,d:'Twin sisters separated at birth discover they have complementary abilities that could reshape reality.'},
  {t:'Cold Fusion',y:2024,type:'movie',s:null,ep:null,rt:131,d:'A disgraced scientist proves cold fusion is real, and every government in the world wants to silence her.'},
  {t:'The Periphery',y:2025,type:'series',s:1,ep:10,rt:null,d:'Residents at the edge of a quarantine zone discover the barrier is not keeping something out — its keeping them in.'},
  {t:'Ghost Protocol',y:2024,type:'movie',s:null,ep:null,rt:124,d:'A hacker collective discovers that the internet has a hidden layer built by an unknown intelligence.'},
  {t:'Undertow',y:2025,type:'series',s:2,ep:14,rt:null,d:'A marine biologist on a remote island research station uncovers evidence of an intelligent underwater civilization.'},
  {t:'The Architect',y:2023,type:'movie',s:null,ep:null,rt:137,d:'A legendary architect is commissioned to build a city from scratch — but the blueprints have a sinister origin.'},
  {t:'Fracture Lines',y:2024,type:'series',s:1,ep:8,rt:null,d:'After a massive earthquake, survivors discover that the crack in the earth leads to a hidden underground world.'},
  {t:'Nightbloom',y:2025,type:'movie',s:null,ep:null,rt:119,d:'A botanist discovers a flower that only blooms at night and grants visions of alternate realities.'},
  {t:'The Recursion',y:2024,type:'series',s:2,ep:18,rt:null,d:'A programmer discovers that their code has been running in a loop for millions of years.'},
  {t:'Atlas Shrugged',y:2025,type:'movie',s:null,ep:null,rt:155,d:'When all satellites simultaneously fail, a navigation expert must find a way to guide the world without GPS.'},
  {t:'Wavelength',y:2024,type:'series',s:3,ep:24,rt:null,d:'Musicians discover that certain frequencies can heal — or destroy — the human mind.'},
  {t:'The Descent',y:2025,type:'movie',s:null,ep:null,rt:143,d:'A team of cavers discovers a vast underground ocean and the ancient creatures that inhabit it.'},
];

for (let i = 0; i < movieTitles.length; i++) {
  const m = movieTitles[i];
  const seed = m.t.toLowerCase().replace(/\s+/g, '');
  const g = [genres[i % genres.length], genres[(i + 3) % genres.length], genres[(i + 7) % genres.length]];
  const score = +(6.5 + Math.random() * 3.4).toFixed(1);
  TITLES.push({
    id: `tt${String(i + 1).padStart(3, '0')}`,
    title: m.t,
    type: m.type,
    genre: g,
    year: m.y,
    rating: ['TV-MA','TV-14','PG-13','R','TV-MA','PG-13'][i % 6],
    score,
    matchScore: Math.floor(70 + Math.random() * 28),
    seasons: m.s,
    episodes: m.ep,
    runtime: m.rt,
    description: m.d,
    director: directors[i % directors.length],
    cast: [names[i % names.length], names[(i + 4) % names.length], names[(i + 8) % names.length]],
    poster: `https://picsum.photos/seed/${seed}p/400/600`,
    backdrop: `https://picsum.photos/seed/${seed}b/1920/1080`,
    thumbnail: `https://picsum.photos/seed/${seed}t/640/360`,
    trailer: '#',
    inMyList: false,
    continueWatching: i < 5,
    progress: i < 5 ? Math.floor(15 + Math.random() * 70) : 0,
    featured: i < 5,
    language: ['English','English','English','Korean','English','Spanish','English','Japanese'][i % 8],
    moods: [moods[i % moods.length], moods[(i + 3) % moods.length]],
  });
}

export default TITLES;
