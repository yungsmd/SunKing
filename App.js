import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Switch, Alert, Modal, Dimensions, Share, Image } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';

const { width } = Dimensions.get('window');
const YELLOW = '#FFC400';
const BLACK = '#1A1A00';
const GREEN = '#00A651';
const BACKEND_URL = 'https://sunking-backend.onrender.com';

const HIDDEN_ACCOUNTS = [
  { name: 'Mary Wanjiru', phone: '0712345678', idNo: '34567890', pin: '1234', customerNo: 'SK-2026-1001', type: 'solar', solarDays: 28, gasTokens: 0 },
  { name: 'John Kamau', phone: '0722345678', idNo: '23456789', pin: '2222', customerNo: 'SK-2026-1002', type: 'solar', solarDays: 5, gasTokens: 0 },
  { name: 'Grace Achieng', phone: '0733345678', idNo: '34567891', pin: '3333', customerNo: 'SK-2026-1003', type: 'gas', solarDays: 0, gasTokens: 6 },
  { name: 'Peter Mwangi', phone: '0744345678', idNo: '45678901', pin: '4444', customerNo: 'SK-2026-1004', type: 'gas', solarDays: 0, gasTokens: 1 },
  { name: 'Faith Njeri', phone: '0755345678', idNo: '56789012', pin: '5555', customerNo: 'SK-2026-1005', type: 'both', solarDays: 12, gasTokens: 3 },
];

const TABS = ['Home', 'Solar', 'Gas', 'Support', 'Profile'];
const SUNKING_PICS = [
  { id: '1', type: 'solar', uri: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800&q=80', title: 'Solar Home System', desc: 'Light + Phone Charging - PayGo' },
  { id: '2', type: 'gas', uri: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&q=80', title: 'SunKing Jiko - Clean Cooking', desc: 'No smoke, faster cooking - PayGo' },
  { id: '3', type: 'solar', uri: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&q=80', title: 'Solar + Gas Combo', desc: 'Mwangaza na Jiko for every home' },
];
const SOLAR_PRODUCTS = [
  { name: 'SunKing Home 60', price: 'KES 200 / week', desc: '2 lights + phone charging' },
  { name: 'SunKing Home 120', price: 'KES 350 / week', desc: '4 lights + TV + charging' },
  { name: 'SunKing Pro 400', price: 'KES 500 / week', desc: '6 lights + TV + fan + charging' },
];
const GAS_PRODUCTS = [
  { name: 'SunKing Jiko Single', price: 'KES 350 / token', desc: '1 burner - 5.5 hrs cooking' },
  { name: 'SunKing Jiko Double', price: 'KES 650 / 2 tokens', desc: '2 burners - 11 hrs cooking' },
  { name: 'SunKing Gas + Solar Combo', price: 'KES 1,500', desc: '30 Days Solar + 4 Gas Tokens' },
];
const normalizePhone = (raw) => {
  let p = String(raw).replace(/\s/g, '');
  if (p.startsWith('+254')) p = '0' + p.slice(4);
  else if (p.startsWith('254')) p = '0' + p.slice(3);
  return p;
};
const isValidKenyanNumber = (raw) => /^(07|01)\d{8}$/.test(normalizePhone(raw));
const safeJson = async (res) => {
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { success: false, message: 'Server returned non-JSON: ' + text.slice(0, 100) }; }
};

export default function App() {
  const [screen, setScreen] = useState('splash');
  const [darkMode, setDarkMode] = useState(false);
  const [user, setUser] = useState(null);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [idNo, setIdNo] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loginPin, setLoginPin] = useState('');
  const [productType, setProductType] = useState(null);
  const [showChooseProduct, setShowChooseProduct] = useState(false);
  const [tabIndex, setTabIndex] = useState(0);
  const scrollRef = useRef(null);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotPhone, setForgotPhone] = useState('');
  const [mpesaNumber, setMpesaNumber] = useState('');
  const [showMpesa, setShowMpesa] = useState(false);
  const [payFor, setPayFor] = useState('Solar');
  const [customAmount, setCustomAmount] = useState('');
  const [paying, setPaying] = useState(false);
  const [statements, setStatements] = useState([]);
  const [serverNotifs, setServerNotifs] = useState([]);
  const [notifications, setNotifications] = useState([
    { id: '1', title: 'Solar Low', msg: 'You have 5 days left. Top up now.', time: '2h ago' },
    { id: '2', title: 'Offer!', msg: 'Buy Solar 30 Days + 4 Gas Tokens = Save KES 250', time: '2 days ago' },
  ]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [chatMsg, setChatMsg] = useState('');
  const [chat, setChat] = useState([{ from: 'ai', text: 'Jambo! I am Daniel, your SunKing Smart AI Assistant. I will help you now while we wait for a real human agent. What is the problem?' }]);
  const [showSuggest, setShowSuggest] = useState(false);
  const [suggestText, setSuggestText] = useState('');
  const [showInfo, setShowInfo] = useState(null);
  const [showProducts, setShowProducts] = useState(null);
  const [fingerprintEnabled, setFingerprintEnabled] = useState(false);
  const [showFingerprintSetup, setShowFingerprintSetup] = useState(false);
  const chatScrollRef = useRef(null);
  const createScrollRef = useRef(null);
  React.useEffect(() => { setTimeout(() => setScreen('welcome'), 1800); }, []);
  const textColor = darkMode ? '#fff' : '#111';
  const cardBg = darkMode ? '#222' : '#fff';
  const bg = darkMode ? '#111' : '#FFFDF0';

  const loadStatements = async (phoneToUse) => {
    const p = phoneToUse || user?.phone || phone;
    if (!p) return;
    try { const r = await fetch(`${BACKEND_URL}/transactions/${normalizePhone(p)}`); const d = await safeJson(r); if (d.success) setStatements(d.transactions); } catch(e) {}
  };
  const loadServerNotifs = async (phoneToUse) => {
    const p = phoneToUse || user?.phone || phone;
    if (!p) return;
    try { const r = await fetch(`${BACKEND_URL}/notifications/${normalizePhone(p)}`); const d = await safeJson(r); if (d.success) setServerNotifs(d.notifications); } catch(e) {}
  };
  const loadStaffReplies = async () => {
    const p = user?.phone || phone;
    if (!p) return;
    try {
      const r = await fetch(`${BACKEND_URL}/support/${normalizePhone(p)}`); const d = await safeJson(r);
      if (d.success) { d.tickets.forEach(t => { if (t.staffReply && !chat.some(c => c.text.includes(t.staffReply))) { setChat(prev => [...prev, { from: 'ai', text: ` ${t.staffName || 'SunKing Staff'} replied to "${t.message}":\n\n${t.staffReply}` }]); } }); }
    } catch(e) {}
  };
  const checkNumberAndProceed = () => {
    if (!isValidKenyanNumber(phone)) return Alert.alert('Put correct number', 'Enter valid Safaricom / Airtel number: 07XX XXX XXX (10 digits) or +254');
    const norm = normalizePhone(phone); setPhone(norm);
    const found = HIDDEN_ACCOUNTS.find(a => a.phone === norm);
    if (found) { setUser(found); setScreen('loginPin'); } else { Alert.alert('New Number', 'This number is not registered. Let\'s create your account.'); setScreen('create'); }
  };
  const logout = () => { Alert.alert('Logout?', 'You will need to enter your details again to login.', [{ text: 'Cancel' }, { text: 'Logout', onPress: () => { setUser(null); setName(''); setPhone(''); setIdNo(''); setPin(''); setConfirmPin(''); setLoginPin(''); setProductType(null); setMpesaNumber(''); setCustomAmount(''); setChatMsg(''); setTabIndex(0); setScreen('welcome'); } }]); };
  const createAccount = async () => {
    if (!name || !phone || !idNo || !pin) return Alert.alert('Missing', 'Fill all fields');
    if (!isValidKenyanNumber(phone)) return Alert.alert('Put correct number', 'Enter 10 digits: 07XX or 01XX, or +254');
    if (pin.length !== 4) return Alert.alert('PIN', 'PIN must be 4 digits');
    if (pin !== confirmPin) return Alert.alert('PIN', 'PINs do not match');
    const norm = normalizePhone(phone);
    const newUser = { name, phone: norm, idNo, pin, customerNo: 'SK-2026-' + Math.floor(1000 + Math.random() * 9000), type: null, solarDays: 0, gasTokens: 0 };
    setUser(newUser); setPhone(norm);
    try { await fetch(`${BACKEND_URL}/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, phone: norm, idNo, customerNo: newUser.customerNo }) }); } catch(e) {}
    setShowFingerprintSetup(true);
  };
  const finishFingerprintSetup = (enable) => { setFingerprintEnabled(enable); setShowFingerprintSetup(false); Alert.alert(enable ? 'Fingerprint On' : 'Skipped', enable ? 'Fingerprint set for easy login next time.' : 'You can turn it on later in Profile.'); setScreen('loginPin'); };
  const fingerprintLogin = async () => {
    if (!fingerprintEnabled && !user) { Alert.alert('Fingerprint Not Set', 'You did not set up fingerprint. Use PIN or turn it on in Profile.'); return; }
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync(); const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !isEnrolled) { Alert.alert('Fingerprint Not Set', 'Set fingerprint in Settings > Security > Fingerprint, then try again.'); return; }
      const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Unlock SunKing with Fingerprint', fallbackLabel: 'Use PIN' });
      if (result.success) setScreen('dashboard'); else Alert.alert('Failed', 'Fingerprint not recognized. Try PIN.');
    } catch (e) { Alert.alert('Fingerprint', 'Fingerprint verified (Demo)', [{ text: 'Continue', onPress: () => setScreen('dashboard') }]); }
  };
  const forgotPin = () => {
    if (!forgotPhone) return Alert.alert('Missing', 'Enter your registered phone number');
    const norm = normalizePhone(forgotPhone);
    const found = HIDDEN_ACCOUNTS.find(a => a.phone === norm) || (user && user.phone === norm ? user : null);
    if (found) { Alert.alert('SMS Sent', `We have sent a message to your number with PIN reset code.\n\nFor demo, your PIN is: ${found.pin}`); setShowForgot(false); } else Alert.alert('Not Found', 'This number is not registered.');
  };
  const chooseProduct = (type) => { setProductType(type); setUser(prev => ({ ...prev, type, solarDays: type === 'gas' ? 0 : 14, gasTokens: type === 'solar' ? 0 : 2 })); setShowChooseProduct(false); Alert.alert('Asante!', `You chose ${type === 'both' ? 'Solar + Gas' : type === 'solar' ? 'Solar Only' : 'Gas Only'}`); };
  const getSmartAIReply = (msg) => {
    const m = msg.toLowerCase();
    if (m.includes('token')) return 'Jambo! For token issue: Check if you entered all 20 digits correctly. If it still says invalid, I have alerted a human agent. An agent will help you shortly.';
    if (m.includes('gas') && (m.includes('vuja') || m.includes('leak') || m.includes('smell'))) return 'Jambo! Safety first: Lock gas NOW, open windows, do NOT light fire. I have marked this as URGENT. A human agent will call you shortly.';
    if (m.includes('gas')) return 'Jambo! For gas, check if token is loaded and valve is open. An agent will help you shortly.';
    if (m.includes('taa') || m.includes('light') || m.includes('solar')) return 'Jambo! For solar light: Check if solar panel is in sun and battery is charged. If still off, I have notified a human agent. An agent will help you shortly.';
    if (m.includes('mpesa') || m.includes('pay') || m.includes('lipa')) return 'Jambo! For M-Pesa: Wait 2 mins, then check Statements. If not reflecting, send me your M-Pesa code. An agent will help you shortly.';
    if (m.includes('jiko') || m.includes('waki')) return 'Jambo! For Jiko not lighting: Check gas token balance and if valve is open. An agent will help you shortly.';
    if (m.includes('hello') || m.includes('jambo') || m.includes('hi')) return 'Jambo! How can I help? You can ask about Token, Gas, Solar, M-Pesa or Jiko. A human agent will join shortly if you need more help.';
    return 'Jambo! An agent will help you shortly. Meanwhile, can you tell me - is it about Token, Gas, Solar, M-Pesa or Jiko?';
  };
  const sendChat = async () => {
    if (!chatMsg.trim()) return; const userMsg = chatMsg; setChat([...chat, { from: 'me', text: userMsg }]); setChatMsg('');
    try { await fetch(`${BACKEND_URL}/support`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: user?.phone || phone, customerNo: user?.customerNo || '', name: user?.name || '', message: userMsg }) }); } catch(e) {}
    setTimeout(() => { setChat(prev => [...prev, { from: 'ai', text: getSmartAIReply(userMsg) + '\n\n— Daniel (Smart AI) | Waiting for human agent... Ticket saved for staff.' }]); setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100); }, 800);
  };
  const sendSuggestion = async () => {
    if (!suggestText.trim()) return Alert.alert('Missing', 'Type your suggestion');
    try { await fetch(`${BACKEND_URL}/suggest`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: user?.phone || phone, customerNo: user?.customerNo || '', name: user?.name || '', suggestion: suggestText }) }); } catch(e) {}
    Alert.alert('Asante!', 'Your suggestion has been sent to SunKing staff.'); setSuggestText(''); setShowSuggest(false);
  };
  const payMpesa = async () => {
    if (!mpesaNumber) return Alert.alert('Missing', 'Enter M-Pesa number');
    if (!isValidKenyanNumber(mpesaNumber)) return Alert.alert('Put correct number', 'M-Pesa number must be 10 digits: 07XX / 01XX or +254');
    if (!customAmount) return Alert.alert('Missing', 'Choose / Enter amount to pay');
    const normMpesa = normalizePhone(mpesaNumber); setPaying(true);
    try {
      const res = await fetch(`${BACKEND_URL}/stk`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: normMpesa, amount: Number(customAmount), payFor: payFor, customerNo: user?.customerNo || '' }) });
      const data = await safeJson(res);
      console.log('STK RESULT:', data);
      if (!data.success) throw new Error(data.error?.errorMessage || data.message || 'STK failed');
      Alert.alert('STK Push Sent', `Check your phone.\nEnter M-Pesa PIN to pay KES ${customAmount} for ${payFor}.`);
      setShowMpesa(false); setCustomAmount('');
      setTimeout(async () => {
        try { const r = await fetch(`${BACKEND_URL}/user/${normMpesa}`); const d = await safeJson(r); if (d.success) { setUser(d.user); Alert.alert('Balance Updated', `Solar: ${d.user.solarDays} days | Gas: ${d.user.gasTokens} tokens`); } } catch(e) {}
        loadStatements(normMpesa); loadServerNotifs(normMpesa);
      }, 30000);
    } catch (e) { Alert.alert('Payment Failed', String(e.message)); } finally { setPaying(false); }
  };
  const inviteFriend = async () => { try { await Share.share({ message: `Download SunKing App! Solar & Gas in one app. Use my code ${user?.customerNo} to join. Mwangaza na Jiko for every home!` }); } catch (e) { Alert.alert('Invite', 'Share link copied.'); } };
  const onSwipeEnd = (e) => { const idx = Math.round(e.nativeEvent.contentOffset.x / width); if (idx >= 0 && idx < TABS.length) { setTabIndex(idx); if (idx === 4) { loadStatements(); loadServerNotifs(); } if (idx === 3) { loadStaffReplies(); } } };
  const goToTab = (i) => { setTabIndex(i); scrollRef.current?.scrollTo({ x: i * width, animated: true }); if (i === 4) { loadStatements(); loadServerNotifs(); } if (i === 3) { loadStaffReplies(); } };
  const isSolarUser = user?.type === 'solar' || user?.type === 'both';
  const isGasUser = user?.type === 'gas' || user?.type === 'both';

  if (screen === 'splash') return (<View style={[styles.center, { backgroundColor: YELLOW }]}><Text style={{ fontSize: 56, fontWeight: 'bold', color: BLACK }}>SunKing</Text><Text style={{ color: BLACK, marginTop: 10, fontSize: 19, fontWeight: '600' }}>Mwangaza na Jiko - For Every Home</Text></View>);
  if (screen === 'welcome') {
    return (<View style={[styles.center, { backgroundColor: bg, padding: 22 }]}><Text style={{ fontSize: 60 }}>☀️</Text><Text style={{ fontSize: 36, fontWeight: 'bold', color: BLACK }}>SunKing</Text><Text style={{ color: '#555', marginVertical: 12, textAlign: 'center', fontSize: 19 }}>Solar & Gas in one app.{"\n"}Simple, fast, secure.</Text><TouchableOpacity style={styles.yellowBtn} onPress={() => setScreen('enterNumber')}><Text style={styles.btnTextBlack}>Get Started →</Text></TouchableOpacity><Text style={{ color: '#888', fontSize: 16, marginTop: 8, textAlign: 'center' }}>Enter your number to Login or Create Account</Text></View>);
  }
  if (screen === 'enterNumber') {
    const hasText = phone.length > 0; const valid = isValidKenyanNumber(phone);
    return (<View style={[styles.center, { backgroundColor: bg, padding: 22 }]}><TouchableOpacity style={{ alignSelf: 'flex-start' }} onPress={() => setScreen('welcome')}><Text style={{ fontSize: 19, color: '#666' }}>← Back</Text></TouchableOpacity><Text style={{ fontSize: 28, fontWeight: 'bold', marginTop: 20 }}>Enter Your Number</Text><Text style={{ color: '#555', marginVertical: 10, fontSize: 18, textAlign: 'center' }}>Safaricom or Airtel{"\n"}10 digits or +254</Text><TextInput style={[styles.input, { width: '100%', fontSize: 22 }]} placeholder="0712345678 or +254712345678" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />{hasText && <Text style={{ fontSize: 17, fontWeight: 'bold', color: valid ? GREEN : 'red' }}>{valid ? '● Valid number' : '● Put correct number'}</Text>}<TouchableOpacity style={[styles.yellowBtn, { width: '100%' }]} onPress={checkNumberAndProceed}><Text style={styles.btnTextBlack}>Proceed →</Text></TouchableOpacity><Text style={{ color: '#888', fontSize: 15, marginTop: 8, textAlign: 'center' }}>Examples: 0712345678 • 0112345678 • +254712345678</Text></View>);
  }
  if (screen === 'create') {
    return (<View style={{ flex: 1, backgroundColor: bg }}><ScrollView ref={createScrollRef} style={{ padding: 22 }}><TouchableOpacity onPress={() => setScreen('enterNumber')}><Text style={{ fontSize: 19, color: '#666', marginBottom: 10 }}>← Back</Text></TouchableOpacity><Text style={{ fontSize: 28, fontWeight: 'bold' }}>Create Account</Text><Text style={{ color: '#555', fontSize: 17, marginBottom: 6 }}>Your number is new. Create your account.</Text><Text style={styles.label}>Phone Number (Safaricom / Airtel)</Text><TextInput style={[styles.input]} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="07XX XXX XXX or +254" />{phone.length > 0 && <Text style={{ fontSize: 17, fontWeight: 'bold', color: isValidKenyanNumber(phone) ? GREEN : 'red' }}>{isValidKenyanNumber(phone) ? '● Valid number' : '● Put correct number'}</Text>}<Text style={styles.label}>Full Name</Text><TextInput style={styles.input} placeholder="e.g. Mary Wanjiru" value={name} onChangeText={setName} /><Text style={styles.label}>ID Number</Text><TextInput style={styles.input} placeholder="ID Number" value={idNo} onChangeText={setIdNo} keyboardType="numeric" /><Text style={styles.label}>Create 4-Digit PIN</Text><TextInput style={styles.input} placeholder="••••" value={pin} onChangeText={setPin} keyboardType="numeric" maxLength={4} secureTextEntry /><Text style={styles.label}>Confirm PIN</Text><TextInput style={styles.input} placeholder="••••" value={confirmPin} onChangeText={setConfirmPin} keyboardType="numeric" maxLength={4} secureTextEntry /><TouchableOpacity style={styles.yellowBtn} onPress={createAccount}><Text style={styles.btnTextBlack}>Create Account →</Text></TouchableOpacity><View style={{ height: 40 }} /></ScrollView><View style={styles.upDownBar}><TouchableOpacity style={styles.navBtn} onPress={() => createScrollRef.current?.scrollTo({ y: 0, animated: true })}><Text style={styles.navBtnText}>↑ Up</Text></TouchableOpacity><Text style={{ color: '#888', fontSize: 15 }}>Scroll</Text><TouchableOpacity style={styles.navBtn} onPress={() => createScrollRef.current?.scrollToEnd({ animated: true })}><Text style={styles.navBtnText}>↓ Down</Text></TouchableOpacity></View><Modal visible={showFingerprintSetup} transparent animationType="slide"><View style={styles.modalBg}><View style={[styles.modalBox, { backgroundColor: cardBg }]}><Text style={{ fontSize: 22, fontWeight: 'bold', color: textColor }}>Set Up Fingerprint?</Text><Text style={{ fontSize: 18, color: textColor, marginVertical: 8 }}>Set up fingerprint for easy login if you want? You can skip and use PIN only.</Text><TouchableOpacity style={styles.yellowBtn} onPress={() => finishFingerprintSetup(true)}><Text style={styles.btnTextBlack}>Yes, Set Up Fingerprint</Text></TouchableOpacity><TouchableOpacity style={styles.blackBtn} onPress={() => finishFingerprintSetup(false)}><Text style={styles.btnTextWhite}>No, Use PIN Only</Text></TouchableOpacity></View></View></Modal></View>);
  }
  if (screen === 'loginPin') {
    return (<View style={[styles.center, { backgroundColor: bg, padding: 22 }]}><TouchableOpacity style={{ alignSelf: 'flex-start' }} onPress={() => setScreen('enterNumber')}><Text style={{ fontSize: 19, color: '#666' }}>← Back</Text></TouchableOpacity><Text style={{ fontSize: 28, fontWeight: 'bold', marginTop: 20 }}>Jambo, {user?.name?.split(' ')[0] || 'Customer'}</Text><Text style={{ color: '#666', fontSize: 18 }}>{user?.customerNo || ''}</Text><Text style={{ marginTop: 26, fontWeight: 'bold', fontSize: 19 }}>Enter Your PIN</Text><TextInput style={[styles.input, { width: '100%', textAlign: 'center', fontSize: 28, letterSpacing: 10 }]} placeholder="••••" value={loginPin} onChangeText={setLoginPin} keyboardType="numeric" maxLength={4} secureTextEntry /><TouchableOpacity style={[styles.yellowBtn, { width: '100%' }]} onPress={() => { if (loginPin === user?.pin) { setScreen('dashboard'); if (!user?.type) setShowChooseProduct(true); loadStatements(user?.phone); loadServerNotifs(user?.phone); } else Alert.alert('Wrong PIN', 'Enter correct PIN'); }}><Text style={styles.btnTextBlack}>Login</Text></TouchableOpacity><TouchableOpacity style={[styles.blackBtn, { width: '100%' }]} onPress={fingerprintLogin}><Text style={styles.btnTextWhite}>Login with Fingerprint</Text></TouchableOpacity><TouchableOpacity onPress={() => { setForgotPhone(phone); setShowForgot(true); }}><Text style={{ marginTop: 14, color: '#B89600', fontWeight: 'bold', fontSize: 18 }}>Forgot PIN?</Text></TouchableOpacity><TouchableOpacity onPress={() => setScreen('enterNumber')}><Text style={{ marginTop: 10, color: '#666', fontSize: 17 }}>Use different number ← Back</Text></TouchableOpacity><Modal visible={showForgot} transparent animationType="slide"><View style={styles.modalBg}><View style={[styles.modalBox, { backgroundColor: cardBg }]}><Text style={{ fontSize: 22, fontWeight: 'bold', color: textColor }}>Forgot PIN?</Text><Text style={{ color: '#888', fontSize: 17 }}>We will send a message to your number</Text><TouchableOpacity style={styles.yellowBtn} onPress={() => { Alert.alert('SMS Sent', `Message sent. Demo PIN: ${user?.pin}`); setShowForgot(false); }}><Text style={styles.btnTextBlack}>Send Message</Text></TouchableOpacity><TouchableOpacity onPress={() => setShowForgot(false)}><Text style={{ textAlign: 'center', color: '#888', fontSize: 17 }}>Cancel</Text></TouchableOpacity></View></View></Modal></View>);
  }
  return (
    <View style={[styles.flex, { backgroundColor: bg }]}>
      <View style={styles.headerYellow}><View><Text style={{ color: BLACK, fontSize: 21, fontWeight: 'bold' }}>Jambo, {user?.name?.split(' ')[0]}</Text><Text style={{ color: BLACK, fontSize: 15 }}>{user?.customerNo} {user?.type ? `• ${user?.type?.toUpperCase()}` : ''}</Text></View><View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><TouchableOpacity onPress={() => { loadServerNotifs(); setShowNotifs(true); }}><Text style={{ fontSize: 24 }}>🔔{notifications.length + serverNotifs.length > 0 ? ` (${notifications.length + serverNotifs.length})` : ''}</Text></TouchableOpacity><Switch value={darkMode} onValueChange={setDarkMode} thumbColor={BLACK} /><Text style={{ color: BLACK, fontSize: 14 }}>{darkMode ? 'Dark' : 'Light'}</Text></View></View>
      <Text style={{ textAlign: 'center', color: '#888', fontSize: 14, marginTop: 6 }}>← Slide left / right to switch →</Text>
      <Modal visible={showChooseProduct} transparent animationType="slide"><View style={styles.modalBg}><View style={[styles.modalBox, { backgroundColor: cardBg }]}><Text style={{ fontSize: 23, fontWeight: 'bold', color: textColor }}>Karibu {user?.name?.split(' ')[0]}!</Text><Text style={{ fontSize: 18, color: textColor, marginVertical: 8 }}>What do you want?</Text><TouchableOpacity style={styles.yellowBtn} onPress={() => chooseProduct('solar')}><Text style={styles.btnTextBlack}>Solar Only</Text></TouchableOpacity><TouchableOpacity style={styles.greenBtn} onPress={() => chooseProduct('gas')}><Text style={styles.btnTextWhite}>Gas Only</Text></TouchableOpacity><TouchableOpacity style={styles.blackBtn} onPress={() => chooseProduct('both')}><Text style={styles.btnTextWhite}>Both Solar + Gas</Text></TouchableOpacity></View></View></Modal>
      <Modal visible={showNotifs} transparent animationType="slide"><View style={styles.modalBg}><View style={[styles.modalBox, { backgroundColor: cardBg, maxHeight: '70%' }]}><Text style={{ fontSize: 22, fontWeight: 'bold', color: textColor }}>Notifications</Text><ScrollView style={{ marginTop: 10 }}>{serverNotifs.map(n => (<View key={n.id} style={[styles.card, { backgroundColor: darkMode ? '#333' : '#FFF3CD' }]}><Text style={{ fontWeight: 'bold', color: textColor, fontSize: 18 }}>{n.title}</Text><Text style={{ color: textColor, fontSize: 17 }}>{n.message || n.msg}</Text><Text style={{ color: '#888', fontSize: 15 }}>{n.date ? new Date(n.date).toLocaleString() : n.time}</Text></View>))}{notifications.map(n => (<View key={n.id} style={[styles.card, { backgroundColor: darkMode ? '#333' : '#F5F5F5' }]}><Text style={{ fontWeight: 'bold', color: textColor, fontSize: 18 }}>{n.title}</Text><Text style={{ color: textColor, fontSize: 17 }}>{n.message || n.msg}</Text><Text style={{ color: '#888', fontSize: 15 }}>{n.date ? new Date(n.date).toLocaleString() : n.time}</Text></View>))}</ScrollView><TouchableOpacity style={styles.blackBtn} onPress={() => setShowNotifs(false)}><Text style={styles.btnTextWhite}>Close</Text></TouchableOpacity></View></View></Modal>
      <Modal visible={!!showInfo} transparent animationType="slide"><View style={styles.modalBg}><View style={[styles.modalBox, { backgroundColor: cardBg }]}><Text style={{ fontSize: 22, fontWeight: 'bold', color: textColor }}>{showInfo === 'about' ? 'About App' : showInfo === 'terms' ? 'Terms & Conditions' : 'Privacy Policy'}</Text><ScrollView style={{ maxHeight: 300, marginVertical: 10 }}><Text style={{ fontSize: 18, color: textColor, lineHeight: 26 }}>{showInfo === 'about' ? 'SunKing App helps you manage Solar and Gas in one place.' : showInfo === 'terms' ? '1. For SunKing customers only.\n2. Payments via M-Pesa STK Push.' : 'We only use your phone number to show your balance. Your PIN is private.'}</Text></ScrollView><TouchableOpacity style={styles.blackBtn} onPress={() => setShowInfo(null)}><Text style={styles.btnTextWhite}>Close</Text></TouchableOpacity></View></View></Modal>
      <Modal visible={!!showProducts} transparent animationType="slide"><View style={styles.modalBg}><View style={[styles.modalBox, { backgroundColor: cardBg, maxHeight: '80%' }]}><Text style={{ fontSize: 22, fontWeight: 'bold', color: textColor }}>{showProducts === 'solar' ? 'All Solar Products (PayGo)' : 'All Gas Products (PayGo)'}</Text><ScrollView style={{ marginTop: 10 }}>{(showProducts === 'solar' ? SOLAR_PRODUCTS : GAS_PRODUCTS).map((p, i) => (<View key={i} style={[styles.card, { backgroundColor: darkMode ? '#333' : '#F5F5F5' }]}><Text style={{ fontWeight: 'bold', fontSize: 19, color: textColor }}>{p.name}</Text><Text style={{ color: textColor, fontSize: 17 }}>{p.desc}</Text><Text style={{ fontWeight: 'bold', color: '#B89600', fontSize: 18 }}>{p.price}</Text><TouchableOpacity style={styles.yellowBtn} onPress={() => { setShowProducts(null); setPayFor(showProducts === 'solar' ? 'Solar' : 'Gas'); setShowMpesa(true); }}><Text style={styles.btnTextBlack}>Buy with M-Pesa →</Text></TouchableOpacity></View>))}</ScrollView><TouchableOpacity style={styles.blackBtn} onPress={() => setShowProducts(null)}><Text style={styles.btnTextWhite}>Close</Text></TouchableOpacity></View></View></Modal>
      <ScrollView ref={scrollRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={onSwipeEnd} style={{ flex: 1 }}>
        <ScrollView style={{ width, padding: 16 }}>
          <View style={[styles.banner, { backgroundColor: YELLOW }]}><Text style={{ color: BLACK, fontSize: 21, fontWeight: 'bold' }}>COMBO OFFER!</Text><Text style={{ color: BLACK, fontSize: 18 }}>Solar 30 Days + 4 Gas Tokens = KES 1,500 Only!</Text><TouchableOpacity style={{ backgroundColor: BLACK, padding: 11, borderRadius: 10, marginTop: 10, alignSelf: 'flex-start' }} onPress={() => { setPayFor('Combo'); setShowMpesa(true); }}><Text style={{ fontWeight: 'bold', color: YELLOW, fontSize: 18 }}>Buy Combo Now</Text></TouchableOpacity></View>
          <View style={{ flexDirection: 'row', gap: 10 }}>{isSolarUser && <View style={[styles.card, { backgroundColor: cardBg, flex: 1 }]}><Text style={{ fontSize: 30 }}>☀️</Text><Text style={{ color: textColor, fontWeight: 'bold', fontSize: 19 }}>Solar</Text><Text style={{ fontSize: 26, fontWeight: 'bold', color: '#B89600' }}>{user?.solarDays} Days</Text></View>}{isGasUser && <View style={[styles.card, { backgroundColor: cardBg, flex: 1 }]}><Text style={{ fontSize: 30 }}>🔥</Text><Text style={{ color: textColor, fontWeight: 'bold', fontSize: 19 }}>Gas</Text><Text style={{ fontSize: 26, fontWeight: 'bold', color: GREEN }}>{user?.gasTokens} Tokens</Text></View>}</View>
          {!user?.type && <TouchableOpacity style={styles.yellowBtn} onPress={() => setShowChooseProduct(true)}><Text style={styles.btnTextBlack}>Choose Solar / Gas →</Text></TouchableOpacity>}
          <TouchableOpacity style={[styles.card, { backgroundColor: cardBg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]} onPress={inviteFriend}><View><Text style={{ fontWeight: 'bold', fontSize: 19, color: textColor }}>Invite / Recommend</Text><Text style={{ color: '#888', fontSize: 16 }}>Invite a friend to SunKing</Text></View><Text style={{ fontSize: 24 }}>→</Text></TouchableOpacity>
          <Text style={{ fontWeight: 'bold', fontSize: 20, color: textColor, marginTop: 12 }}>SunKing - Press Picture to See Products</Text>
          {SUNKING_PICS.map(p => (<TouchableOpacity key={p.id} onPress={() => setShowProducts(p.type)} style={{ borderRadius: 14, overflow: 'hidden', backgroundColor: cardBg, elevation: 3, marginVertical: 8 }}><Image source={{ uri: p.uri }} style={{ width: '100%', height: 200 }} resizeMode="cover" /><View style={{ padding: 14 }}><Text style={{ fontWeight: 'bold', fontSize: 19, color: textColor }}>{p.title}</Text><Text style={{ color: '#888', fontSize: 16 }}>{p.desc}</Text><Text style={{ color: '#B89600', fontWeight: 'bold', fontSize: 16, marginTop: 4 }}>Tap to see all {p.type === 'solar' ? 'Solar' : 'Gas'} Products →</Text></View></TouchableOpacity>))}
        </ScrollView>
        <ScrollView style={{ width, padding: 16 }}>{isSolarUser ? (<><View style={[styles.card, { backgroundColor: cardBg }]}><Text style={{ fontSize: 21, fontWeight: 'bold', color: textColor }}>Solar Balance</Text><Text style={{ fontSize: 42, fontWeight: 'bold', color: '#B89600' }}>{user?.solarDays} Days</Text></View><TouchableOpacity style={styles.yellowBtn} onPress={() => { setPayFor('Solar'); setShowMpesa(true); }}><Text style={styles.btnTextBlack}>Lipa na M-Pesa - Add Days</Text></TouchableOpacity><View style={[styles.card, { backgroundColor: cardBg }]}><Text style={{ fontWeight: 'bold', fontSize: 19, color: textColor }}>Solar Tip</Text><Text style={{ fontSize: 18, color: textColor, marginTop: 4 }}>Charge phone during day to save solar at night. Keep solar panel in direct sun, clean it weekly.</Text></View><TouchableOpacity style={styles.blackBtn} onPress={() => setShowProducts('solar')}><Text style={styles.btnTextWhite}>See All Solar Products (PayGo) →</Text></TouchableOpacity></>) : (<View style={[styles.card, { backgroundColor: cardBg }]}><Text style={{ fontSize: 21, fontWeight: 'bold', color: textColor }}>You Don't Have Solar Yet</Text><TouchableOpacity style={styles.yellowBtn} onPress={() => chooseProduct(user?.type === 'gas' ? 'both' : 'solar')}><Text style={styles.btnTextBlack}>Add Solar</Text></TouchableOpacity></View>)}</ScrollView>
        <ScrollView style={{ width, padding: 16 }}>{isGasUser ? (<><View style={[styles.card, { backgroundColor: cardBg }]}><Text style={{ fontSize: 21, fontWeight: 'bold', color: textColor }}>Gas Balance</Text><Text style={{ fontSize: 42, fontWeight: 'bold', color: GREEN }}>{user?.gasTokens} Tokens</Text><Text style={{ color: textColor, fontSize: 18 }}>1 Token = 5.5 hrs cooking</Text></View><TouchableOpacity style={styles.greenBtn} onPress={() => { setPayFor('Gas'); setShowMpesa(true); }}><Text style={styles.btnTextWhite}>Buy Gas Token</Text></TouchableOpacity><View style={[styles.card, { backgroundColor: '#FFF3CD' }]}><Text style={{ fontSize: 19, fontWeight: 'bold', color: BLACK }}>Gas Tip - For Gas Users Only</Text><Text style={{ fontSize: 18, color: BLACK, marginTop: 4 }}>Ensure to lock gas if not in use. Always close the valve after cooking to stay safe and save gas.</Text></View><TouchableOpacity style={styles.blackBtn} onPress={() => setShowProducts('gas')}><Text style={styles.btnTextWhite}>See All Gas Products (PayGo) →</Text></TouchableOpacity></>) : (<View style={[styles.card, { backgroundColor: cardBg }]}><Text style={{ fontSize: 21, fontWeight: 'bold', color: textColor }}>You Don't Have Gas Yet</Text><TouchableOpacity style={styles.greenBtn} onPress={() => chooseProduct(user?.type === 'solar' ? 'both' : 'gas')}><Text style={styles.btnTextWhite}>Add Gas</Text></TouchableOpacity></View>)}</ScrollView>
        <View style={{ width, padding: 16, flex: 1 }}>
          <Text style={{ fontWeight: 'bold', fontSize: 22, color: textColor }}>Support - Smart AI Daniel</Text><Text style={{ color: '#888', marginBottom: 10, fontSize: 17 }}>Daniel replies instantly. Real human joins if needed.</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{['Token inakataliwa', 'Gas inavuja', 'Jiko haliwaki', 'Taa haziwaki'].map(p => (<TouchableOpacity key={p} style={{ backgroundColor: YELLOW, padding: 10, borderRadius: 20 }} onPress={async () => { setChat([...chat, { from: 'me', text: p }]); try { await fetch(`${BACKEND_URL}/support`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: user?.phone || phone, customerNo: user?.customerNo || '', name: user?.name || '', message: p }) }); } catch(e) {} setTimeout(() => { setChat(prev => [...prev, { from: 'ai', text: getSmartAIReply(p) + '\n\n— Daniel (Smart AI) | Waiting for human agent... Ticket saved for staff.' }]); setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100); }, 800); }}><Text style={{ fontWeight: 'bold', fontSize: 16 }}>{p}</Text></TouchableOpacity>))}</View>
          <TouchableOpacity style={[styles.card, { backgroundColor: cardBg }]} onPress={() => setShowSuggest(true)}><Text style={{ fontWeight: 'bold', fontSize: 19, color: textColor }}>Suggest Something to Add on App</Text><Text style={{ color: '#888', fontSize: 16 }}>Have an idea? →</Text></TouchableOpacity>
          <View style={{ backgroundColor: cardBg, borderRadius: 14, padding: 12, height: 260 }}><ScrollView ref={chatScrollRef} onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: true })}>{chat.map((c, i) => (<View key={i} style={{ alignSelf: c.from === 'me' ? 'flex-end' : 'flex-start', backgroundColor: c.from === 'me' ? YELLOW : '#E8F5FF', padding: 10, borderRadius: 12, marginVertical: 4, maxWidth: '85%' }}><Text style={{ fontSize: 17 }}>{c.text}</Text></View>))}</ScrollView></View>
          <View style={styles.upDownBar}><TouchableOpacity style={styles.navBtn} onPress={() => chatScrollRef.current?.scrollTo({ y: 0, animated: true })}><Text style={styles.navBtnText}>↑ Up</Text></TouchableOpacity><Text style={{ color: '#888', fontSize: 15 }}>Chat Navigation</Text><TouchableOpacity style={styles.navBtn} onPress={() => chatScrollRef.current?.scrollToEnd({ animated: true })}><Text style={styles.navBtnText}>↓ Down</Text></TouchableOpacity></View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}><TextInput style={[styles.input, { flex: 1 }]} placeholder="Ask Daniel..." value={chatMsg} onChangeText={setChatMsg} /><TouchableOpacity style={{ backgroundColor: BLACK, padding: 14, borderRadius: 12, justifyContent: 'center' }} onPress={sendChat}><Text style={{ color: YELLOW, fontWeight: 'bold', fontSize: 18 }}>Send</Text></TouchableOpacity></View>
          <TouchableOpacity style={[styles.blackBtn, { marginTop: 8 }]} onPress={loadStaffReplies}><Text style={styles.btnTextWhite}>Check Staff Reply</Text></TouchableOpacity>
          <Modal visible={showSuggest} transparent animationType="slide"><View style={styles.modalBg}><View style={[styles.modalBox, { backgroundColor: cardBg }]}><Text style={{ fontSize: 22, fontWeight: 'bold', color: textColor }}>Suggest / Report Inquiry</Text><TextInput style={[styles.input, { height: 100, textAlignVertical: 'top' }]} placeholder="e.g. Please add..." value={suggestText} onChangeText={setSuggestText} multiline /><TouchableOpacity style={styles.yellowBtn} onPress={sendSuggestion}><Text style={styles.btnTextBlack}>Send Suggestion</Text></TouchableOpacity><TouchableOpacity onPress={() => setShowSuggest(false)}><Text style={{ textAlign: 'center', color: '#888', fontSize: 17 }}>Cancel</Text></TouchableOpacity></View></View></Modal>
        </View>
        <ScrollView style={{ width, padding: 16 }}>
          <View style={[styles.card, { backgroundColor: cardBg }]}><Text style={{ fontWeight: 'bold', color: textColor, fontSize: 21 }}>{user?.name}</Text><Text style={{ color: '#888', fontSize: 17 }}>{user?.customerNo}</Text><Text style={{ color: '#888', fontSize: 17 }}>Product: {user?.type?.toUpperCase() || 'Not chosen yet'}</Text></View>
          <TouchableOpacity style={styles.yellowBtn} onPress={() => setShowChooseProduct(true)}><Text style={styles.btnTextBlack}>Change / Choose Product</Text></TouchableOpacity>
          <View style={[styles.card, { backgroundColor: cardBg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}><View><Text style={{ fontWeight: 'bold', fontSize: 19, color: textColor }}>Fingerprint Login</Text><Text style={{ color: '#888', fontSize: 16 }}>{fingerprintEnabled ? 'ON - Easy login' : 'OFF - Use PIN only'}</Text></View><Switch value={fingerprintEnabled} onValueChange={(v) => { setFingerprintEnabled(v); Alert.alert(v ? 'Fingerprint ON' : 'Fingerprint OFF', v ? 'You can now login with fingerprint.' : 'You will login with PIN only.'); }} thumbColor={BLACK} /></View>
          <TouchableOpacity style={[styles.card, { backgroundColor: cardBg }]} onPress={inviteFriend}><Text style={{ fontWeight: 'bold', fontSize: 19, color: textColor }}>Invite / Recommend a Friend</Text><Text style={{ color: '#888', fontSize: 16 }}>Share via WhatsApp / SMS →</Text></TouchableOpacity>
          <Text style={{ fontWeight: 'bold', fontSize: 20, color: textColor, marginTop: 10 }}>About App</Text>
          <TouchableOpacity style={[styles.card, { backgroundColor: cardBg }]} onPress={() => setShowInfo('about')}><Text style={{ fontSize: 19, color: textColor }}>About App →</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.card, { backgroundColor: cardBg }]} onPress={() => setShowInfo('terms')}><Text style={{ fontSize: 19, color: textColor }}>Terms & Conditions →</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.card, { backgroundColor: cardBg }]} onPress={() => setShowInfo('privacy')}><Text style={{ fontSize: 19, color: textColor }}>Privacy Policy →</Text></TouchableOpacity>
          <Text style={{ fontWeight: 'bold', fontSize: 20, color: textColor, marginTop: 10 }}>Statements - Real from Server</Text>
          {statements.length === 0 ? <Text style={{ color: '#888', fontSize: 17, marginTop: 6 }}>No payments yet. Pay with M-Pesa and it will show here.</Text> : statements.map(s => (<View key={s.id} style={[styles.card, { backgroundColor: cardBg }]}><Text style={{ fontWeight: 'bold', color: textColor, fontSize: 19 }}>{s.payFor} - KES {s.amount}</Text><Text style={{ color: '#888', fontSize: 17 }}>{new Date(s.date).toLocaleString()} • M-Pesa: {s.mpesaCode || 'Pending'} • {s.status}</Text></View>))}
          <TouchableOpacity style={styles.blackBtn} onPress={() => { loadStatements(); loadServerNotifs(); }}><Text style={styles.btnTextWhite}>Refresh Statements</Text></TouchableOpacity>
          <TouchableOpacity style={styles.blackBtn} onPress={logout}><Text style={styles.btnTextWhite}>Logout</Text></TouchableOpacity>
        </ScrollView>
      </ScrollView>
      <View style={styles.floatingNav}>{TABS.map((t, i) => (<TouchableOpacity key={t} onPress={() => goToTab(i)}><Text style={{ color: tabIndex === i ? BLACK : '#888', fontWeight: tabIndex === i ? 'bold' : 'normal', fontSize: 14, textAlign: 'center' }}>{t === 'Home' ? '🏠\nHome' : t === 'Solar' ? '☀️\nSolar' : t === 'Gas' ? '🔥\nGas' : t === 'Support' ? '🛠️\nSupport' : '👤\nProfile'}</Text></TouchableOpacity>))}</View>
      <Modal visible={showMpesa} transparent animationType="slide"><View style={styles.modalBg}><View style={[styles.modalBox, { backgroundColor: cardBg }]}><Text style={{ fontSize: 22, fontWeight: 'bold', color: textColor }}>M-Pesa Payment - {payFor}</Text><Text style={{ color: '#888', marginVertical: 6, fontSize: 18 }}>Choose M-Pesa number:</Text><TextInput style={styles.input} placeholder="07XX XXX XXX or +254" value={mpesaNumber} onChangeText={setMpesaNumber} keyboardType="phone-pad" />{mpesaNumber.length > 0 && <Text style={{ fontSize: 17, fontWeight: 'bold', color: isValidKenyanNumber(mpesaNumber) ? GREEN : 'red' }}>{isValidKenyanNumber(mpesaNumber) ? '● Valid number' : '● Put correct number'}</Text>}<TouchableOpacity style={styles.blackBtn} onPress={() => setMpesaNumber(user?.phone || '')}><Text style={styles.btnTextWhite}>Use My Number</Text></TouchableOpacity><Text style={{ color: textColor, marginTop: 10, fontSize: 19, fontWeight: 'bold' }}>Choose Amount to Pay:</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 8 }}>{['200', '350', '500', '1000', '1500'].map(a => (<TouchableOpacity key={a} onPress={() => setCustomAmount(a)} style={{ backgroundColor: customAmount === a ? YELLOW : '#eee', padding: 12, borderRadius: 10, minWidth: 70, alignItems: 'center' }}><Text style={{ fontWeight: 'bold', fontSize: 17 }}>KES {a}</Text></TouchableOpacity>))}</View><TextInput style={styles.input} placeholder="Or enter your own amount e.g. 750" value={customAmount} onChangeText={setCustomAmount} keyboardType="numeric" /><TouchableOpacity style={styles.yellowBtn} onPress={payMpesa}><Text style={styles.btnTextBlack}>{paying ? 'Sending...' : `Send STK Push → KES ${customAmount || '---'}`}</Text></TouchableOpacity><TouchableOpacity onPress={() => setShowMpesa(false)}><Text style={{ textAlign: 'center', marginTop: 10, color: '#888', fontSize: 17 }}>Cancel</Text></TouchableOpacity></View></View></Modal>
    </View>
  );
}
const styles = StyleSheet.create({
  flex: { flex: 1 }, center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerYellow: { backgroundColor: YELLOW, padding: 16, paddingTop: 42, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  card: { padding: 18, borderRadius: 14, marginVertical: 7, elevation: 2 },
  banner: { padding: 18, borderRadius: 14, marginBottom: 10 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 15, marginVertical: 7, fontSize: 19 },
  label: { fontWeight: 'bold', marginTop: 12, fontSize: 19 },
  yellowBtn: { backgroundColor: YELLOW, padding: 16, borderRadius: 12, marginVertical: 7, alignItems: 'center' },
  greenBtn: { backgroundColor: GREEN, padding: 16, borderRadius: 12, marginVertical: 7, alignItems: 'center' },
  blackBtn: { backgroundColor: BLACK, padding: 16, borderRadius: 12, marginVertical: 7, alignItems: 'center' },
  btnTextBlack: { color: BLACK, fontWeight: 'bold', fontSize: 19 },
  btnTextWhite: { color: '#fff', fontWeight: 'bold', fontSize: 19 },
  floatingNav: { flexDirection: 'row', justifyContent: 'space-around', padding: 14, backgroundColor: '#fff', borderRadius: 22, marginHorizontal: 15, marginBottom: 16, marginTop: 6, elevation: 5 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { padding: 22, borderTopLeftRadius: 22, borderTopRightRadius: 22 },
  upDownBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 8, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee' },
  navBtn: { backgroundColor: YELLOW, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  navBtnText: { fontWeight: 'bold', fontSize: 16, color: BLACK },
});