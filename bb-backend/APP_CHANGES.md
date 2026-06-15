# App.js Changes — Connect to Backend
5 focused changes. Nothing else breaks.

## 1. Install AsyncStorage (one command in your project folder)
```
npx expo install @react-native-async-storage/async-storage
```

## 2. Add imports at top of App.js
```js
import { initSession, fetchCareers, syncWatchEvent, restoreWatchState, generateReport } from './src/api';
```

## 3. In App() — add 3 new state vars and a useEffect
```js
// ADD these with your existing useState lines:
const [careers, setCareers]       = useState([]);
const [sessionId, setSessionId]   = useState(null);
const [loading, setLoading]       = useState(true);
const syncTimers = useRef({});    // ADD alongside watchTimers ref

// ADD this useEffect right after your existing state declarations:
useEffect(() => {
  async function init() {
    try {
      const [sid, careersData] = await Promise.all([initSession(), fetchCareers()]);
      setSessionId(sid);
      setCareers(careersData);
      const d = {};
      careersData.forEach(c => { d[c.id] = { seconds: 0, saved: false }; });
      const restored = await restoreWatchState(sid);
      if (restored) Object.entries(restored).forEach(([id, s]) => { d[id] = s; });
      setWatchData(d);
    } catch (e) {
      console.error('Init failed:', e);
    } finally {
      setLoading(false);
    }
  }
  init();
}, []);
```

## 4. Replace computeResults() with this:
```js
const computeResults = async () => {
  if (!sessionId) return;
  // Flush all current watch data to backend first
  await Promise.all(
    careers.map(c => syncWatchEvent(sessionId, c.id, watchData[c.id] || { seconds: 0, saved: false }))
  );
  const report = await generateReport(sessionId);
  setResults(report);  // report has .wiring and .top_careers (same shape as before)
  setScreen('results');
};
```

## 5. Replace hardcoded CAREERS with `careers` everywhere
- In FlatList: `data={careers}` instead of `data={CAREERS}`  
- In watchData init inside resetters: loop `careers.forEach(...)` instead of `CAREERS.forEach(...)`
- Delete the entire `const CAREERS = [...]` block at the top

## 6. Add a loading screen (before the splash return)
```js
if (loading) return (
  <View style={{ flex:1, backgroundColor:'#0A0F1A', alignItems:'center', justifyContent:'center' }}>
    <ActivityIndicator size="large" color="#00D8FF" />
  </View>
);
```
(Add `ActivityIndicator` to your react-native import)

## 7. Update ResultsScreen — top_careers uses different shape
Backend returns `top_careers` as: `[{ career_id, name, emoji, color, score }]`  
Change `m.career.name` → `m.name`, `m.career.emoji` → `m.emoji` in ResultsScreen.
For the "tap to see roadmap" — you need to fetch the career: `onCareerTap` should call `fetchCareers()` and find by id, OR store careers in parent state and pass down.
