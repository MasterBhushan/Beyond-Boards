import { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, Dimensions,
  TouchableOpacity, StatusBar, Animated, ScrollView, Linking
} from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';
import { initSession, fetchCareers, syncWatchEvent, restoreWatchState, generateReport } from './src/api';

const { width, height } = Dimensions.get('window');

const WIRING_LABELS = {
  impact: 'Impact & Care', precision: 'Precision & Detail', creation: 'Creative Drive',
  logic: 'Logic & Systems', expression: 'Self-Expression', endurance: 'Endurance & Grit',
  power: 'Power & Influence', purpose: 'Sense of Purpose', risk: 'Risk Appetite',
  leadership: 'Leadership', aesthetics: 'Aesthetic Sense', security: 'Stability Seeking',
  connection: 'Human Connection', discipline: 'Discipline & Routine', persuasion: 'Persuasion'
};

function SpinningLogo() {
  const spinAnim = useRef(new Animated.Value(0)).current;
  const started = useRef(false);
  if (!started.current) {
    started.current = true;
    Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 4000, useNativeDriver: true })
    ).start();
  }
  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <Animated.Image
      source={require('./assets/logo.png')}
      style={[styles.logo, { transform: [{ rotate: spin }] }]}
      resizeMode="contain"
    />
  );
}

export default function App() {
  const [screen, setScreen]         = useState('splash');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [feedReady, setFeedReady]   = useState(false);
  const [careers, setCareers]       = useState([]);
  const [sessionId, setSessionId]   = useState(null);
  const [loading, setLoading]       = useState(true);
  const [watchData, setWatchData]   = useState({});
  const [results, setResults]       = useState(null);
  const [roadmapCareer, setRoadmapCareer] = useState(null);
  const watchTimers = useRef({});
  const syncTimers  = useRef({});

  // ── Boot: load session + careers + restore state
  useEffect(() => {
    async function init() {
      try {
        const [sid, careersData] = await Promise.all([initSession(), fetchCareers()]);
        setSessionId(sid);
        setCareers(careersData);

        const d = {};
        careersData.forEach(c => { d[c.id] = { seconds: 0, saved: false, openedYoutube: false, viewedRoadmap: false }; });

        const restored = await restoreWatchState(sid);
        if (restored && Object.keys(restored).length > 0) {
          Object.entries(restored).forEach(([careerId, state]) => { d[careerId] = state; });
        }
        setWatchData(d);
      } catch (err) {
        console.error('Init error — running in offline mode:', err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // ── Debounced sync to backend (fires 5s after last change per career)
  const debouncedSync = (careerId, state) => {
    if (!sessionId) return;
    clearTimeout(syncTimers.current[careerId]);
    syncTimers.current[careerId] = setTimeout(() => {
      syncWatchEvent(sessionId, careerId, state).catch(console.error);
    }, 5000);
  };

  const startTimer = (idx) => {
    if (!careers[idx]) return;
    const careerId = careers[idx].id;
    clearInterval(watchTimers.current[idx]);
    watchTimers.current[idx] = setInterval(() => {
      setWatchData(prev => {
        const updated = { ...prev, [careerId]: { ...prev[careerId], seconds: (prev[careerId]?.seconds || 0) + 1 } };
        debouncedSync(careerId, updated[careerId]);
        return updated;
      });
    }, 1000);
  };

  const stopTimer = (idx) => clearInterval(watchTimers.current[idx]);

  const startApp = () => {
    setScreen('feed');
    setTimeout(() => { setFeedReady(true); startTimer(0); }, 1000);
  };

  const onSlideChange = (idx) => {
    stopTimer(currentIdx);
    setCurrentIdx(idx);
    startTimer(idx);
    if (idx === careers.length - 1) setTimeout(() => computeResults(), 4000);
  };

  const toggleSave = (careerId) => {
    setWatchData(prev => {
      const updated = { ...prev, [careerId]: { ...prev[careerId], saved: !prev[careerId].saved } };
      debouncedSync(careerId, updated[careerId]);
      return updated;
    });
  };

  const onWatchYouTube = (career) => {
    setWatchData(prev => {
      const updated = { ...prev, [career.id]: { ...prev[career.id], openedYoutube: true } };
      debouncedSync(career.id, updated[career.id]);
      return updated;
    });
    Linking.openURL(`https://www.youtube.com/watch?v=${career.youtubeId}`);
  };

  const onViewRoadmap = (career) => {
    setWatchData(prev => {
      const updated = { ...prev, [career.id]: { ...prev[career.id], viewedRoadmap: true } };
      debouncedSync(career.id, updated[career.id]);
      return updated;
    });
    setRoadmapCareer(career);
  };

  const computeResults = async () => {
    console.log('computeResults fired, sessionId:', sessionId, 'careers:', careers.length);
    if (!sessionId || careers.length === 0) {
      alert(`Debug: sessionId=${sessionId}, careers=${careers.length}`);
      return;
    }

    try {
      await Promise.all(
        careers.map(c => syncWatchEvent(sessionId, c.id, watchData[c.id] || { seconds: 0, saved: false }))
      );

      const report = await generateReport(sessionId);
      console.log('Report received:', JSON.stringify(report));

      if (!report) {
        alert('Debug: report came back empty/null');
        return;
      }

      setResults(report);
      setScreen('results');
    } catch (err) {
      console.error('computeResults error:', err);
      alert(`Debug error: ${err.message}`);
    }
  };

  // ── Loading screen
  if (loading) return (
    <View style={{ flex: 1, backgroundColor: '#0A0F1A', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#00D8FF', fontSize: 16 }}>Loading Beyond Boards...</Text>
    </View>
  );

  if (roadmapCareer) return <RoadmapScreen career={roadmapCareer} onBack={() => setRoadmapCareer(null)} />;
  if (screen === 'splash') return <SplashScreen onStart={startApp} />;
  if (screen === 'results' && results) return (
    <ResultsScreen
      results={results}
      onCareerTap={(career) => setRoadmapCareer(career)}
      onRetake={() => {
        setScreen('feed'); setCurrentIdx(0); setFeedReady(false);
        setTimeout(() => { setFeedReady(true); startTimer(0); }, 500);
      }}
      onStartAgain={() => {
        setScreen('splash'); setCurrentIdx(0); setFeedReady(false);
        const d = {};
        careers.forEach(c => { d[c.id] = { seconds: 0, saved: false, openedYoutube: false, viewedRoadmap: false }; });
        setWatchData(d);
        Object.values(watchTimers.current).forEach(t => clearInterval(t));
      }}
    />
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <FlatList
        data={careers}
        keyExtractor={item => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={height}
        decelerationRate="fast"
        onMomentumScrollEnd={e => {
          const idx = Math.round(e.nativeEvent.contentOffset.y / height);
          onSlideChange(idx);
        }}
        renderItem={({ item, index }) => (
          <CareerSlide
            item={item}
            isActive={feedReady && index === currentIdx}
            watchData={watchData[item.id] || { seconds: 0, saved: false }}
            onWatchYouTube={() => onWatchYouTube(item)}
            onSave={() => toggleSave(item.id)}
            onViewRoadmap={() => onViewRoadmap(item)}
          />
        )}
      />
      <View style={styles.topBar} pointerEvents="box-none">
        <SpinningLogo />
        <View style={styles.counterPill}>
          <Text style={styles.counterText}>{currentIdx + 1} / {careers.length}</Text>
        </View>
      </View>
      <View style={styles.dots} pointerEvents="none">
        {careers.map((_, i) => (
          <View key={i} style={[styles.dot, i === currentIdx && styles.dotActive]} />
        ))}
      </View>
      {currentIdx === careers.length - 1 && (
        <TouchableOpacity style={styles.resultsCta} onPress={computeResults}>
          <Text style={styles.resultsCtaText}>✦ See Your Wiring Report</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function CareerSlide({ item, isActive, watchData, onWatchYouTube, onSave, onViewRoadmap }) {
  const [muted, setMuted] = useState(true);
  const videoHeight = width * (16 / 9);

  return (
    <View style={{ width, height, backgroundColor: '#000', overflow: 'hidden' }}>
      <View style={{ position: 'absolute', top: 0, left: 0, width, height, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <YoutubePlayer
          height={videoHeight} width={width} videoId={item.youtubeId}
          play={isActive} mute={muted}
          initialPlayerParams={{ controls: false, rel: false, loop: true, modestbranding: true }}
        />
      </View>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} pointerEvents="none">
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: height * 0.65, backgroundColor: 'rgba(0,0,0,0.6)' }} />
      </View>
      <TouchableOpacity
        style={{ position: 'absolute', top: 110, right: 16, backgroundColor: 'rgba(0,0,0,0.5)', width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', zIndex: 5 }}
        onPress={() => setMuted(m => !m)}
      >
        <Text style={{ fontSize: 17 }}>{muted ? '🔇' : '🔊'}</Text>
      </TouchableOpacity>
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingBottom: 44, paddingTop: 24, zIndex: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: item.color, marginRight: 8 }} />
          <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1.5, color: item.color }}>{item.name.toUpperCase()}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', width: 74 }}>watched {watchData.seconds}s</Text>
          <View style={{ flex: 1, height: 3, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
            <View style={{ height: 3, borderRadius: 2, backgroundColor: item.color, width: `${Math.min((watchData.seconds / 30) * 100, 100)}%` }} />
          </View>
        </View>
        <Text style={{ fontSize: 20, fontWeight: '800', color: '#fff', lineHeight: 26, marginBottom: 6 }}>{item.title}</Text>
        {/* FIXED: was item.desc, backend returns item.description */}
        <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 19, marginBottom: 18 }}>{item.description}</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity style={{ flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: item.color, alignItems: 'center' }} onPress={onWatchYouTube}>
            <Text style={{ color: '#0A0F1A', fontWeight: '800', fontSize: 14 }}>▶  Watch on YouTube</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ width: 48, height: 48, borderRadius: 14, borderWidth: 0.5, borderColor: watchData.saved ? item.color : 'rgba(255,255,255,0.2)', backgroundColor: watchData.saved ? item.color + '25' : 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' }}
            onPress={onSave}
          >
            <Text style={{ fontSize: 21, color: watchData.saved ? item.color : 'rgba(255,255,255,0.4)' }}>{watchData.saved ? '★' : '☆'}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={{ marginTop: 10, paddingVertical: 10, borderRadius: 14, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.15)', alignItems: 'center' }}
          onPress={onViewRoadmap}
        >
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>📍 See Roadmap After 10th</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function RoadmapScreen({ career, onBack }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#0A0F1A' }}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0F1A" />
      <View style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 20, backgroundColor: '#0A0F1A' }}>
        <TouchableOpacity onPress={onBack} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
          <Text style={{ color: '#00D8FF', fontSize: 16 }}>← Back</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 40, marginBottom: 8 }}>{career.emoji}</Text>
        <Text style={{ fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 4 }}>{career.name}</Text>
        <Text style={{ fontSize: 12, letterSpacing: 2, color: career.color }}>YOUR ROADMAP AFTER 10TH</Text>
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 60 }}>
        <Text style={road.sectionTitle}>📚 SUBJECTS TO TAKE</Text>
        <View style={road.card}>
          {career.roadmap.subjects.map((s, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: i < career.roadmap.subjects.length - 1 ? 10 : 0 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: career.color, marginRight: 10 }} />
              <Text style={{ color: '#fff', fontSize: 14 }}>{s}</Text>
            </View>
          ))}
        </View>
        <Text style={road.sectionTitle}>✍️ EXAMS TO CRACK</Text>
        <View style={road.card}>
          {career.roadmap.exams.map((e, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: i < career.roadmap.exams.length - 1 ? 10 : 0 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: career.color, marginRight: 10 }} />
              <Text style={{ color: '#fff', fontSize: 14 }}>{e}</Text>
            </View>
          ))}
        </View>
        <Text style={road.sectionTitle}>📅 YEAR BY YEAR TIMELINE</Text>
        {career.roadmap.timeline.map((t, i) => (
          <View key={i} style={{ flexDirection: 'row', marginBottom: 12 }}>
            <View style={{ alignItems: 'center', marginRight: 12 }}>
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: career.color, marginTop: 3 }} />
              {i < career.roadmap.timeline.length - 1 && (
                <View style={{ width: 2, flex: 1, backgroundColor: career.color + '30', marginTop: 4 }} />
              )}
            </View>
            <View style={{ flex: 1, backgroundColor: '#1A2235', borderRadius: 12, padding: 14, marginBottom: 4 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: career.color, letterSpacing: 1, marginBottom: 4 }}>{t.year.toUpperCase()}</Text>
              <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 20 }}>{t.task}</Text>
            </View>
          </View>
        ))}
        <Text style={road.sectionTitle}>🏛️ TOP COLLEGES</Text>
        <View style={road.card}>
          {career.roadmap.colleges.map((c, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: i < career.roadmap.colleges.length - 1 ? 10 : 0 }}>
              <Text style={{ color: career.color, marginRight: 8, fontSize: 14 }}>★</Text>
              <Text style={{ color: '#fff', fontSize: 14 }}>{c}</Text>
            </View>
          ))}
        </View>
        <View style={{ backgroundColor: career.color + '15', borderLeftWidth: 3, borderLeftColor: career.color, borderRadius: 12, padding: 16, marginTop: 8, marginBottom: 20 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: career.color, letterSpacing: 1, marginBottom: 8 }}>💡 HONEST TIP</Text>
          <Text style={{ fontSize: 14, color: '#fff', lineHeight: 22 }}>{career.roadmap.tip}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const road = StyleSheet.create({
  sectionTitle: { fontSize: 10, letterSpacing: 2, color: 'rgba(255,255,255,0.4)', marginBottom: 10, marginTop: 20 },
  card: { backgroundColor: '#1A2235', borderRadius: 14, padding: 16, marginBottom: 4 },
});

function SplashScreen({ onStart }) {
  const spinAnim = useRef(new Animated.Value(0)).current;
  const started = useRef(false);
  if (!started.current) {
    started.current = true;
    Animated.loop(Animated.timing(spinAnim, { toValue: 1, duration: 4000, useNativeDriver: true })).start();
  }
  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <View style={splash.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0F1A" />
      <Animated.Image source={require('./assets/logo.png')} style={[splash.logo, { transform: [{ rotate: spin }] }]} resizeMode="contain" />
      <Text style={splash.title}>Beyond Boards</Text>
      <Text style={splash.sub}>CAREER DISCOVERY</Text>
      <Text style={splash.tagline}>Real Work. Real World. Real You.</Text>
      <TouchableOpacity style={splash.btn} onPress={onStart}>
        <Text style={splash.btnText}>Start Exploring →</Text>
      </TouchableOpacity>
      <Text style={splash.hint}>10 careers · Swipe up to explore</Text>
    </View>
  );
}

function ResultsScreen({ results, onRetake, onStartAgain, onCareerTap }) {
  const topCareers = results.top_careers || [];
  const wiring = results.wiring || [];
  const topName = topCareers[0]?.name || 'Unknown';

  return (
    <ScrollView style={res.container} contentContainerStyle={{ paddingBottom: 60 }}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0F1A" />
      <Text style={res.eyebrow}>YOUR WIRING REPORT</Text>
      <Text style={res.title}>Your instincts{'\n'}point to <Text style={res.highlight}>{topName}</Text></Text>
      <Text style={res.section}>YOUR WIRING</Text>
      {wiring.map(w => (
        <View key={w.key} style={res.wiringCard}>
          <View style={res.wiringRow}>
            <Text style={res.wiringLabel}>{w.label || WIRING_LABELS[w.key] || w.key}</Text>
            <Text style={res.wiringScore}>{w.score}%</Text>
          </View>
          <View style={res.barBg}>
            <View style={[res.barFill, { width: `${w.score}%` }]} />
          </View>
        </View>
      ))}
      <Text style={res.section}>TOP CAREER MATCHES</Text>
      <View style={res.grid}>
        {topCareers.map((m, i) => (
          <TouchableOpacity
            key={m.career_id}
            style={[res.tile, i === 0 && res.tileTop]}
            onPress={() => onCareerTap({ id: m.career_id, name: m.name, emoji: m.emoji, color: m.color })}
          >
            {i === 0 && <Text style={res.topBadge}>TOP MATCH</Text>}
            <Text style={res.tileEmoji}>{m.emoji}</Text>
            <Text style={res.tileName}>{m.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity style={res.retake} onPress={onRetake}>
        <Text style={res.retakeText}>Retake the experience</Text>
      </TouchableOpacity>
      <TouchableOpacity style={res.startAgain} onPress={onStartAgain}>
        <Text style={res.startAgainText}>Start Again</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 14, paddingRight: 20, paddingTop: 52, paddingBottom: 10 },
  logo: { width: 36, height: 36 },
  counterPill: { backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 100, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.2)' },
  counterText: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  dots: { position: 'absolute', right: 14, top: '50%', transform: [{ translateY: -60 }], zIndex: 20 },
  dot: { width: 4, height: 6, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 2 },
  dotActive: { height: 20, backgroundColor: '#00D8FF' },
  resultsCta: { position: 'absolute', bottom: 40, alignSelf: 'center', backgroundColor: '#00D8FF', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 100, zIndex: 20 },
  resultsCtaText: { color: '#0A0F1A', fontWeight: '800', fontSize: 15 },
});

const splash = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0F1A', alignItems: 'center', justifyContent: 'center', padding: 24 },
  logo: { width: 110, height: 110, marginBottom: 20 },
  title: { fontSize: 32, fontWeight: '800', color: '#fff', letterSpacing: -0.5, marginBottom: 4 },
  sub: { fontSize: 11, letterSpacing: 3, color: '#00D8FF', marginBottom: 12 },
  tagline: { fontSize: 15, color: 'rgba(255,255,255,0.5)', marginBottom: 40 },
  btn: { backgroundColor: '#00D8FF', paddingHorizontal: 40, paddingVertical: 15, borderRadius: 100, marginBottom: 16 },
  btnText: { color: '#0A0F1A', fontWeight: '800', fontSize: 16 },
  hint: { fontSize: 12, color: 'rgba(255,255,255,0.3)' },
});

const res = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0F1A', padding: 24, paddingTop: 60, paddingBottom: 40 },
  eyebrow: { fontSize: 10, letterSpacing: 2.5, color: '#00D8FF', marginBottom: 12 },
  title: { fontSize: 28, fontWeight: '800', color: '#fff', lineHeight: 36, marginBottom: 28 },
  highlight: { color: '#00D8FF' },
  section: { fontSize: 10, letterSpacing: 2, color: 'rgba(255,255,255,0.3)', marginBottom: 12, marginTop: 8 },
  wiringCard: { backgroundColor: '#1A2235', borderRadius: 12, padding: 14, marginBottom: 10 },
  wiringRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  wiringLabel: { fontSize: 13, fontWeight: '600', color: '#fff' },
  wiringScore: { fontSize: 13, color: '#00D8FF' },
  barBg: { height: 3, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2 },
  barFill: { height: 3, backgroundColor: '#00D8FF', borderRadius: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  tile: { width: '47%', backgroundColor: '#1A2235', borderRadius: 14, padding: 16, alignItems: 'center' },
  tileTop: { borderWidth: 0.5, borderColor: 'rgba(0,216,255,0.4)', backgroundColor: 'rgba(0,216,255,0.06)' },
  topBadge: { fontSize: 9, letterSpacing: 1, color: '#0A0F1A', backgroundColor: '#00D8FF', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 100, marginBottom: 6 },
  tileEmoji: { fontSize: 28, marginBottom: 6 },
  tileName: { fontSize: 12, fontWeight: '700', color: '#fff', textAlign: 'center' },
  retake: { alignSelf: 'center', padding: 12 },
  retakeText: { color: 'rgba(255,255,255,0.3)', fontSize: 13, textDecorationLine: 'underline' },
  startAgain: { alignSelf: 'center', padding: 12, marginTop: 12, backgroundColor: '#00D8FF', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 100 },
  startAgainText: { color: '#0A0F1A', fontWeight: '700', fontSize: 14 },
});