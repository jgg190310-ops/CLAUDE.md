import React, { useEffect, useRef, useState } from 'react';
import {
  Animated, Dimensions, FlatList, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View,
  type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollViewInstance,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { CormorantGaramond_300Light } from '@expo-google-fonts/cormorant-garamond/300Light';
import { CormorantGaramond_400Regular } from '@expo-google-fonts/cormorant-garamond/400Regular';
import { CormorantGaramond_400Regular_Italic } from '@expo-google-fonts/cormorant-garamond/400Regular_Italic';
import { CormorantGaramond_500Medium } from '@expo-google-fonts/cormorant-garamond/500Medium';
import { Montserrat_500Medium } from '@expo-google-fonts/montserrat/500Medium';
import { Montserrat_600SemiBold } from '@expo-google-fonts/montserrat/600SemiBold';
import { Glass, GlassGroup, NATIVE_GLASS } from './src/Glass';
import { BRAND, DISTANCES, HERO, HISTORY, IMG, NUMBERS, ROOMS, SPECS } from './src/content';

// Identidade do book: noite e areia alternadas, bronze nos detalhes.
const C = { noite: '#0e0d0c', noite2: '#171513', areia: '#f2ede4', tinta: '#1f1b16', bronze: '#9a7438', ouro: '#c9a96e', cal: '#f6f2ea', muted: '#b9ae9b' };
const F = { light: 'CormorantGaramond_300Light', serif: 'CormorantGaramond_400Regular', italic: 'CormorantGaramond_400Regular_Italic', serifM: 'CormorantGaramond_500Medium', sans: 'Montserrat_500Medium', sansB: 'Montserrat_600SemiBold' };
const tap = () => Haptics.selectionAsync().catch(() => {});

export default function App() {
  const [loaded] = useFonts({ CormorantGaramond_300Light, CormorantGaramond_400Regular, CormorantGaramond_400Regular_Italic, CormorantGaramond_500Medium, Montserrat_500Medium, Montserrat_600SemiBold });
  if (!loaded) return <View style={{ flex: 1, backgroundColor: C.noite }} />;
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Book />
    </SafeAreaProvider>
  );
}

function Caps({ children, color = C.ouro, size = 10.5, style }: { children: React.ReactNode; color?: string; size?: number; style?: object }) {
  return <Text style={[{ fontFamily: F.sansB, fontSize: size, letterSpacing: size * 0.32, textTransform: 'uppercase', color }, style]}>{children}</Text>;
}
function Kick({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <View style={s.kick}>
      <View style={[s.kickLine, { backgroundColor: color }]} />
      <Caps color={color}>{children}</Caps>
    </View>
  );
}

function Book() {
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = Dimensions.get('window');
  const scroll = useRef<ScrollViewInstance>(null);
  const pos = useRef<Record<string, number>>({});
  const at = (k: string) => (e: LayoutChangeEvent) => { pos.current[k] = e.nativeEvent.layout.y; };
  const go = (k: string) => { tap(); scroll.current?.scrollTo({ y: Math.max(0, (pos.current[k] ?? 0) - insets.top - 8), animated: true }); };

  // abertura: os ambientes, um a um
  const [hi, setHi] = useState(0);
  const [autoplay, setAutoplay] = useState(true);
  const fades = useRef(HERO.map((_, i) => new Animated.Value(i === 0 ? 1 : 0))).current;
  useEffect(() => {
    fades.forEach((v, i) => Animated.timing(v, { toValue: i === hi ? 1 : 0, duration: 900, useNativeDriver: true }).start());
  }, [hi]);
  useEffect(() => {
    if (!autoplay) return;
    const t = setTimeout(() => setHi((hi + 1) % HERO.length), 4500);
    return () => clearTimeout(t);
  }, [hi, autoplay]);

  // barra de atalhos aparece depois da abertura
  const [dock, setDock] = useState(false);
  const dockY = useRef(new Animated.Value(120)).current;
  useEffect(() => { Animated.spring(dockY, { toValue: dock ? 0 : 120, useNativeDriver: true, damping: 16, stiffness: 160 }).start(); }, [dock]);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => { const y = e.nativeEvent.contentOffset.y; if ((y > H * 0.7) !== dock) setDock(y > H * 0.7); };

  // visualizador de fotos
  const [viewer, setViewer] = useState<number | null>(null);

  return (
    <View style={{ flex: 1, backgroundColor: C.noite }}>
      <ScrollView ref={scroll} onScroll={onScroll} scrollEventThrottle={32} contentContainerStyle={{ paddingBottom: 0 }}>
        {/* ============ ABERTURA ============ */}
        <View style={{ height: H, backgroundColor: '#000' }}>
          {HERO.map((r, i) => (
            <Animated.View key={r.key} style={[StyleSheet.absoluteFill, { opacity: fades[i] }]}>
              <Image source={IMG[r.key]} style={StyleSheet.absoluteFill} contentFit="cover" transition={0} />
            </Animated.View>
          ))}
          <LinearGradient colors={['rgba(8,7,6,0.55)', 'rgba(8,7,6,0)', 'rgba(8,7,6,0.1)', 'rgba(8,7,6,0.9)']} locations={[0, 0.25, 0.5, 1]} style={StyleSheet.absoluteFill} />
          <View style={[s.topRow, { paddingTop: insets.top + 10 }]}>
            <Glass variant="clear" style={s.topPill}><Caps size={9.5} color={C.cal}>Book #102 · </Caps><Caps size={9.5}>Luxemburgo</Caps></Glass>
            <Pressable onPress={() => go('ficha')}><Glass variant="clear" interactive style={s.topPill}><Text style={s.topBtn}>Ficha técnica</Text></Glass></Pressable>
          </View>
          <View style={[s.heroBody, { paddingBottom: insets.bottom + 18 }]}>
            <Caps>Belo Horizonte · Minas Gerais</Caps>
            <Text style={s.h1}>Apto{'\n'}Luxemburgo</Text>
            <Text style={s.tag}>Há lugares que você visita. E há este, que você vive, e nunca mais quer sair.</Text>
            <Glass style={s.phase}>
              <GlassGroup spacing={6} style={s.seg}>
                {HERO.map((r, i) => {
                  const on = i === hi;
                  return (
                    <Pressable key={r.key} style={{ flex: 1 }} onPress={() => { tap(); setAutoplay(false); setHi(i); }} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={r.name}>
                      <Glass variant={on ? 'regular' : 'clear'} interactive tint={on ? 'rgba(246,242,234,0.9)' : undefined} style={[s.segBtn, !NATIVE_GLASS && on ? { backgroundColor: 'rgba(246,242,234,0.92)' } : null]}>
                        <Text style={[s.segNo, { color: on ? C.bronze : C.ouro }]}>{String(i + 1).padStart(2, '0')}</Text>
                        <Text style={[s.segName, { color: on ? C.tinta : 'rgba(246,242,234,0.82)' }]}>{r.name}</Text>
                      </Glass>
                    </Pressable>
                  );
                })}
              </GlassGroup>
              <Text style={s.phaseTxt}>{HERO[hi].line}</Text>
              <View style={s.phaseMeta}><Caps size={9} color="rgba(246,242,234,0.6)">120 m² · 3 quartos · 1º andar</Caps><Caps size={9} color="rgba(246,242,234,0.6)">{hi + 1} / {HERO.length}</Caps></View>
            </Glass>
          </View>
        </View>

        {/* ============ SÍNTESE ============ */}
        <View style={[s.sec, s.light]} onLayout={at('sintese')}>
          <Kick color={C.bronze}>Em síntese</Kick>
          <Text style={[s.h2, { color: C.tinta }]}>O essencial, <Text style={s.h2i}>em números</Text></Text>
          <Text style={[s.lead, { color: '#3b342b' }]}>Um apartamento de 120 m² no primeiro andar, com a planta inteira voltada para o sol da manhã.</Text>
          <Pressable onPress={() => { tap(); setViewer(-1); }} style={s.planta}>
            <Image source={IMG.planta} style={{ width: '100%', aspectRatio: 1149 / 1600 }} contentFit="contain" />
            <View style={s.plantaCap}><Caps size={9} color="#7d6a4f">Planta humanizada</Caps><Caps size={9} color="#7d6a4f">Toque para ampliar</Caps></View>
          </Pressable>
          <View style={s.nums}>
            {NUMBERS.map((n) => (
              <View key={n.label} style={s.numRow}>
                <Text style={s.numN}>{n.n}{n.unit ? <Text style={s.numU}> {n.unit}</Text> : null}</Text>
                <View style={{ flex: 1 }}>
                  <Caps size={10.5} color="#3b342b">{n.label}</Caps>
                  {n.sub ? <Text style={s.numSub}>{n.sub}</Text> : null}
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ============ AMBIENTES ============ */}
        <View style={[s.sec, s.light, { paddingTop: 8 }]} onLayout={at('ambientes')}>
          <Kick color={C.bronze}>01 · O imóvel</Kick>
          <Text style={[s.h2, { color: C.tinta }]}>Pronto <Text style={s.h2i}>para morar</Text></Text>
          <Text style={s.quote}>“O ipê floresce na seca, quando parece que acabou. A madeira gasta conserva o veio por baixo do desgaste; basta alguém tirar o tempo de cima dela.”</Text>
          <Caps color={C.bronze} style={{ marginTop: 14 }}>O piso de ipê original, restaurado</Caps>
          <Image source={IMG.ipe} style={s.ipe} contentFit="cover" />
          {ROOMS.map((r, i) => (
            <Pressable key={r.key} onPress={() => { tap(); setViewer(i); }} style={({ pressed }) => [s.room, pressed && { transform: [{ scale: 0.985 }] }]}>
              <View style={s.roomIm}>
                <Image source={IMG[r.key]} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} />
                <Glass variant="clear" style={s.roomNo}><Caps size={9.5} color={C.cal}>Fig. 01.{i + 1}</Caps></Glass>
              </View>
              <Text style={s.roomName}>{r.name}</Text>
              <Text style={s.roomLine}>{r.line}</Text>
            </Pressable>
          ))}
          <Text style={s.note}>Fotos com decoração ilustrativa, para mostrar o uso de cada ambiente.</Text>
        </View>

        {/* ============ BAIRRO ============ */}
        <View onLayout={at('bairro')} style={{ backgroundColor: C.noite }}>
          <View style={{ height: H * 0.72 }}>
            <Image source={IMG.bairro} style={StyleSheet.absoluteFill} contentFit="cover" />
            <LinearGradient colors={['rgba(14,13,12,0.25)', 'rgba(14,13,12,0)', 'rgba(14,13,12,0.96)']} locations={[0, 0.4, 1]} style={StyleSheet.absoluteFill} />
            <View style={{ position: 'absolute', left: 22, right: 22, bottom: 28 }}>
              <Kick color={C.ouro}>02 · Vida no entorno</Kick>
              <Text style={[s.h2, { color: C.cal, fontSize: 46 }]}>O ritmo certo entre <Text style={s.h2i}>o movimento e a calma</Text></Text>
            </View>
          </View>
          <View style={s.sec}>
            <Text style={[s.lead, { color: '#ddd3c2', marginTop: 0 }]}>A manhã no Luxemburgo começa numa rua residencial ainda quieta. São 600 metros até o Parque Tom Jobim. Na volta, mercado, farmácia e feira ficam a menos de 1 km de casa.</Text>
            <View style={{ marginTop: 26 }}>
              {DISTANCES.map((d) => (
                <View key={d.when} style={s.dist}>
                  <View style={[s.dot, { backgroundColor: d.color }]} />
                  <View style={{ flex: 1 }}><Caps size={10.5} color={d.color}>{d.when}</Caps><Text style={s.distTxt}>{d.what}</Text></View>
                </View>
              ))}
            </View>
            <View style={s.park}>
              <Image source={IMG.parque} style={{ width: '100%', aspectRatio: 16 / 10 }} contentFit="cover" />
              <Glass style={s.parkCard}>
                <Caps>A 600 metros</Caps>
                <Text style={s.parkH}>Parque Mosteiro Tom Jobim</Text>
                <Text style={s.parkP}>Cerca de 6.400 m² de mata nativa, nascentes preservadas, brinquedos, quadra e academia a céu aberto.</Text>
              </Glass>
            </View>
            <View style={{ marginTop: 40, borderLeftWidth: 1, borderLeftColor: 'rgba(201,169,110,0.4)', marginLeft: 4 }}>
              {HISTORY.map((h) => (
                <View key={h.when} style={s.hist}>
                  <View style={s.histDot} />
                  <Caps size={9.5}>{h.when}</Caps>
                  <Text style={s.histT}>{h.title}</Text>
                  <Text style={s.histP}>{h.text}</Text>
                </View>
              ))}
            </View>
            <Text style={s.src}>Fontes do book: Arquivo Público da Cidade de BH; Estado de Minas (2015); Colônia Luxemburguesa; Amalux. A origem do nome é uma explicação possível.</Text>
          </View>
        </View>

        {/* ============ FICHA ============ */}
        <View style={[s.sec, s.light]} onLayout={at('ficha')}>
          <Kick color={C.bronze}>03 · Ficha técnica</Kick>
          <Text style={[s.h2, { color: C.tinta }]}>O apartamento <Text style={s.h2i}>em detalhe</Text></Text>
          <View style={{ marginTop: 26, borderTopWidth: 1, borderTopColor: 'rgba(154,116,56,0.55)' }}>
            {SPECS.map(([k, v]) => (
              <View key={k} style={s.spec}><Caps size={9.5} color="#3b342b" style={{ flexShrink: 0 }}>{k}</Caps><Text style={s.specV}>{v}</Text></View>
            ))}
          </View>
        </View>

        {/* ============ VISITA ============ */}
        <View onLayout={at('visita')} style={[s.sec, { backgroundColor: C.noite, paddingBottom: insets.bottom + 120 }]}>
          <Caps>Visita</Caps>
          <Text style={[s.h2, { color: C.cal, marginTop: 10 }]}>Será um prazer <Text style={s.h2i}>apresentar o imóvel</Text></Text>
          <Text style={[s.lead, { color: '#d8c8a6', fontFamily: F.italic }]}>Valores e condições sob consulta.</Text>
          {BRAND ? ((B) => (
            <View style={{ marginTop: 22 }}>
              {([['Corretor', B.corretor], ['CRECI', B.creci], ['Site', B.site], ['Instagram', B.instagram]] as const).filter(([, v]) => v).map(([k, v]) => (
                <View key={k} style={s.crow}><Caps size={9.5}>{k}</Caps><Text style={s.crowV}>{v}</Text></View>
              ))}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 22, flexWrap: 'wrap' }}>
                {B.whatsapp ? (
                  <Pressable onPress={() => { tap(); Linking.openURL('https://wa.me/' + B.whatsapp.replace(/\D/g, '')); }} style={s.gold}><Text style={s.goldT}>Agendar visita</Text></Pressable>
                ) : null}
                <Pressable onPress={() => { tap(); Linking.openURL('https://' + B.site); }}><Glass interactive style={s.ghost}><Text style={s.ghostT}>{B.site}</Text></Glass></Pressable>
              </View>
            </View>
          ))(BRAND) : null}
          <Text style={[s.src, { marginTop: 36 }]}>Fotos com decoração ilustrativa. Informações sujeitas a confirmação documental e alteração sem aviso prévio. Este material não constitui oferta vinculante.{BRAND ? ` Intermediação: ${BRAND.corretor} · ${BRAND.creci} · ${BRAND.name}.` : ''}</Text>
        </View>
      </ScrollView>

      {/* ============ ATALHOS EM VIDRO ============ */}
      <Animated.View pointerEvents={dock ? 'auto' : 'none'} style={[s.dockWrap, { bottom: insets.bottom + 10, transform: [{ translateY: dockY }] }]}>
        <GlassGroup spacing={8} style={s.dock}>
          {([['ambientes', 'Ambientes'], ['bairro', 'Bairro'], ['ficha', 'Ficha'], ['visita', 'Visita']] as const).map(([k, label]) => (
            <Pressable key={k} onPress={() => go(k)}>
              <Glass interactive style={s.dockBtn}><Text style={s.dockT}>{label}</Text></Glass>
            </Pressable>
          ))}
        </GlassGroup>
      </Animated.View>

      <Viewer index={viewer} onClose={() => setViewer(null)} width={W} height={H} />
    </View>
  );
}

/** Fotos em tela cheia, deslizando para os lados. Índice -1 abre a planta. */
function Viewer({ index, onClose, width, height }: { index: number | null; onClose: () => void; width: number; height: number }) {
  const insets = useSafeAreaInsets();
  const items = index === -1 ? [{ src: IMG.planta, title: 'Planta humanizada', line: 'Ilustrativa, para mostrar a disposição dos ambientes.' }] : ROOMS.map((r) => ({ src: IMG[r.key], title: r.name, line: r.line }));
  const [cur, setCur] = useState(0);
  useEffect(() => { if (index !== null) setCur(Math.max(0, index)); }, [index]);
  return (
    <Modal visible={index !== null} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: '#060504' }}>
        <FlatList
          data={items} horizontal pagingEnabled showsHorizontalScrollIndicator={false}
          initialScrollIndex={Math.max(0, index ?? 0)} getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          onMomentumScrollEnd={(e) => { setCur(Math.round(e.nativeEvent.contentOffset.x / width)); tap(); }}
          keyExtractor={(it) => it.title}
          renderItem={({ item }) => <Image source={item.src} style={{ width, height }} contentFit="contain" />}
        />
        <View style={[s.vTop, { paddingTop: insets.top + 10 }]}>
          <Glass style={s.vInfo}>
            <Caps size={9.5}>{index === -1 ? 'Planta' : `Fig. 01.${cur + 1} · ${cur + 1} de ${items.length}`}</Caps>
            <Text style={s.vTitle}>{items[cur]?.title}</Text>
            <Text style={s.vLine}>{items[cur]?.line}</Text>
          </Glass>
          <Pressable onPress={() => { tap(); onClose(); }} accessibilityLabel="Fechar"><Glass interactive style={s.vClose}><Text style={{ color: C.cal, fontSize: 20, lineHeight: 22 }}>✕</Text></Glass></Pressable>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  light: { backgroundColor: C.areia },
  sec: { paddingHorizontal: 22, paddingVertical: 64 },
  kick: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  kickLine: { width: 34, height: 1, opacity: 0.7 },
  h2: { fontFamily: F.serif, fontSize: 42, lineHeight: 44 },
  h2i: { fontFamily: F.italic },
  lead: { fontFamily: F.serif, fontSize: 21, lineHeight: 30, marginTop: 16 },
  topRow: { position: 'absolute', left: 16, right: 16, top: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  topPill: { height: 40, borderRadius: 20, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' },
  topBtn: { fontFamily: F.sans, fontSize: 12.5, color: C.cal, letterSpacing: 0.6 },
  heroBody: { position: 'absolute', left: 16, right: 16, bottom: 0 },
  h1: { fontFamily: F.light, fontSize: 64, lineHeight: 60, color: C.cal, marginTop: 12, marginBottom: 12 },
  tag: { fontFamily: F.italic, fontSize: 20, lineHeight: 27, color: '#e8d9bb', marginBottom: 18, maxWidth: 330 },
  phase: { borderRadius: 30, padding: 12 },
  seg: { flexDirection: 'row', gap: 6 },
  segBtn: { height: 54, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  segNo: { fontFamily: F.sansB, fontSize: 9.5, letterSpacing: 2 },
  segName: { fontFamily: F.sans, fontSize: 13, marginTop: 2 },
  phaseTxt: { fontFamily: F.italic, fontSize: 18.5, lineHeight: 25, color: '#efe4cf', paddingHorizontal: 8, paddingTop: 12, minHeight: 64 },
  phaseMeta: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 8, paddingTop: 6 },
  planta: { backgroundColor: '#f7f3ec', padding: 10, marginTop: 30 },
  plantaCap: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  nums: { marginTop: 30, borderTopWidth: 1, borderTopColor: 'rgba(154,116,56,0.5)' },
  numRow: { flexDirection: 'row', alignItems: 'center', gap: 18, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(154,116,56,0.5)' },
  numN: { fontFamily: F.serif, fontSize: 54, lineHeight: 56, color: C.bronze, minWidth: 86 },
  numU: { fontSize: 20 },
  numSub: { fontFamily: F.italic, fontSize: 16, color: '#7d6a4f', marginTop: 3 },
  quote: { fontFamily: F.italic, fontSize: 25, lineHeight: 35, color: '#2b251e', marginTop: 24 },
  ipe: { width: '100%', aspectRatio: 3 / 2, marginTop: 22, borderRadius: 4 },
  room: { marginTop: 34 },
  roomIm: { width: '100%', aspectRatio: 4 / 5, borderRadius: 4, overflow: 'hidden', backgroundColor: '#e2d9ca' },
  roomNo: { position: 'absolute', left: 12, top: 12, height: 32, borderRadius: 16, paddingHorizontal: 12, justifyContent: 'center' },
  roomName: { fontFamily: F.serif, fontSize: 30, color: C.bronze, marginTop: 12 },
  roomLine: { fontFamily: F.serif, fontSize: 18, lineHeight: 25, color: '#3b342b', marginTop: 2 },
  note: { fontFamily: F.sans, fontSize: 11.5, color: '#7d6a4f', marginTop: 28 },
  dist: { flexDirection: 'row', gap: 14, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(201,169,110,0.22)' },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  distTxt: { fontFamily: F.serif, fontSize: 20, lineHeight: 26, color: '#e2d8c6', marginTop: 3 },
  park: { marginTop: 44, borderRadius: 6, overflow: 'hidden' },
  parkCard: { position: 'absolute', left: 10, right: 10, bottom: 10, borderRadius: 22, padding: 16 },
  parkH: { fontFamily: F.serif, fontSize: 26, color: C.cal, marginTop: 6 },
  parkP: { fontFamily: F.serif, fontSize: 16.5, lineHeight: 22, color: '#e8dfcf', marginTop: 4 },
  hist: { paddingLeft: 22, paddingBottom: 26 },
  histDot: { position: 'absolute', left: -5, top: 3, width: 9, height: 9, borderRadius: 5, borderWidth: 1, borderColor: C.ouro, backgroundColor: C.noite },
  histT: { fontFamily: F.serif, fontSize: 24, color: C.cal, marginTop: 6 },
  histP: { fontFamily: F.sans, fontSize: 13, lineHeight: 20, color: C.muted, marginTop: 4 },
  src: { fontFamily: F.sans, fontSize: 11, lineHeight: 17, color: '#8a8070', marginTop: 8 },
  spec: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(154,116,56,0.55)' },
  specV: { fontFamily: F.serif, fontSize: 21, color: C.tinta, textAlign: 'right', flexShrink: 1 },
  crow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 13, borderTopWidth: 1, borderTopColor: 'rgba(201,169,110,0.25)' },
  crowV: { fontFamily: F.sans, fontSize: 14, color: C.cal },
  gold: { height: 52, borderRadius: 26, paddingHorizontal: 24, backgroundColor: C.ouro, justifyContent: 'center' },
  goldT: { fontFamily: F.sansB, fontSize: 12.5, letterSpacing: 1.2, textTransform: 'uppercase', color: '#1a140c' },
  ghost: { height: 52, borderRadius: 26, paddingHorizontal: 22, justifyContent: 'center' },
  ghostT: { fontFamily: F.sans, fontSize: 13.5, color: C.cal },
  dockWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  dock: { flexDirection: 'row', gap: 6 },
  dockBtn: { height: 46, borderRadius: 23, paddingHorizontal: 16, justifyContent: 'center' },
  dockT: { fontFamily: F.sans, fontSize: 13.5, color: C.cal },
  vTop: { position: 'absolute', left: 14, right: 14, top: 0, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  vInfo: { flex: 1, borderRadius: 24, paddingHorizontal: 18, paddingVertical: 12 },
  vTitle: { fontFamily: F.serif, fontSize: 24, color: C.cal, marginTop: 4 },
  vLine: { fontFamily: F.serif, fontSize: 16, color: '#ddd3c2', marginTop: 2 },
  vClose: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
});
