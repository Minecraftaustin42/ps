const express = require('express');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '100mb' })); 
app.use(express.static(path.join(__dirname, 'public')));
app.use("/seo", express.static(path.join(__dirname, "public", "seo")));

// In-memory databases
const DB_FILE = path.join(__dirname, 'db.json');
let db = {
    users: [], sessions: {}, games: [], shopItems: [], clothingItems: [], blueprints: [], jams: [], groups: [], cityPlots: [], datastores: {},
    globalChat: [], toolboxItems: [], // NEW
    chatLogs: [],
    systemState: { restartUntil: 0, restartMessage: '' },
    reports: [],
    notifications: [],
    moderation: { bans: {}, ipBans: [], warnings: {} },  // <-- ADD THIS LINE
    friendPetDaily: {},
    live: { accounts: [], channelStats: {} }
};

let chatActivity = {}; // Tracks timestamps for spam { userId: [timestamps] }
let chatSuspensions = {}; // Tracks suspensions { userId: unbanTimestamp }

let activeEditors = {}; 
let deletedObjectTombstones = {}; // { [gameId]: { [objectId]: { ownerId, deletedAt } } }
let activePlayers = {}; 
let activePlayDynamic = {};
let onlineUsers = {};   
let gameChats = {}; // { [gameId]: [messages] }
let gameChatActivity = {}; // { [gameId_userId]: [timestamps] }
let gameChatSuspensions = {}; // { [gameId_userId]: unbanTimestamp }
let gameServerLastSeen = {}; // { [gameId]: timestamp }
let liveStreams = {}; // { [streamId]: { ...runtime state... } }
let trustPlayState = {}; // { [userId]: { lastPos:{x,y,z,rotY}, lastMoveAt, lastAwardAt, lastDailyAt } }
let adminAuth = { attempts: 0, lockoutUntil: 0 };
const RESTART_POPUP_TEXT = 'Playsculpt servers are restarting! You do not need to take any action if you’re in a game or in studio, you will stay in. Please wait around 10 seconds to be automatically reconnected!';
let restartState = { active: false, startedAt: 0, endsAt: 0, message: '' };
let httpServer = null;
const systemEventClients = new Set();
// Load existing DB if available & migrate data
if (fs.existsSync(DB_FILE)) {



if (!db.datastores) db.datastores = {};
if (!db.notifications) db.notifications = [];
if (!db.reports) db.reports = [];
if (!db.chatLogs) db.chatLogs = [];
if (!db.systemState) db.systemState = { restartUntil: 0, restartMessage: '' };
if (!db.moderation) db.moderation = { bans: {}, ipBans: [], warnings: {} }; // <-- ADD THIS LINE
if (!db.friendPetDaily) db.friendPetDaily = {};
if (!db.live) db.live = { accounts: [], channelStats: {} };
if (!db.systemState.lastSignup) db.systemState.lastSignup = { username: '', at: 0, source: 'system' };
    try {
        const loaded = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        db = { ...db, ...loaded };
        
        if (!db.shopItems) db.shopItems = [];
        if (!db.clothingItems) db.clothingItems = [];
        if (!db.blueprints) db.blueprints = [];
        if (!db.jams) db.jams = [];
        if (!db.moderation) db.moderation = { bans: {}, ipBans: [], warnings: {} };
        if (!db.groups) db.groups = [];
if (!db.sounds) db.sounds = [];
        if (!db.reports) db.reports = [];
        if (!db.systemState) db.systemState = { restartUntil: 0, restartMessage: '' };
        if (!db.chatLogs) db.chatLogs = [];
        if (!db.live) db.live = { accounts: [], channelStats: {} };
        if (!db.systemState) db.systemState = { restartUntil: 0, restartMessage: '' };
        if (!db.systemState.lastSignup) db.systemState.lastSignup = { username: '', at: 0, source: 'system' };

        db.users.forEach(u => { 
            if (!u.followers) u.followers = []; 
if (!u.createdAt) u.createdAt = Date.now();
            if (!u.friends) u.friends = [];
            u.friends = (u.friends || []).map(f => (typeof f === 'string' ? { id: f, addedAt: Date.now(), xp: 0, level: 0, rewardTier: 0, lastXpAt: 0 } : { ...f, xp: f.xp || 0, level: f.level || 0, rewardTier: f.rewardTier || 0, lastXpAt: f.lastXpAt || 0 }));
            if (!u.friendRequests) u.friendRequests = [];
            if (!u.color) u.color = '#e74c3c';
if (!u.toolboxInventory) u.toolboxInventory = [];
            if (!u.recentlyPlayed) u.recentlyPlayed = [];
            if (!u.badges) u.badges = [];
            if (!u.reportCrates) u.reportCrates = [];
            if (typeof u.accurateReports === 'undefined') u.accurateReports = 0;
            if (!u.messages) u.messages = [];
            if (!u.inventory) u.inventory = [];
            if (!u.clothingInventory) u.clothingInventory = [];
            if (typeof u.equippedShirt === 'undefined') u.equippedShirt = null;
            if (typeof u.equippedPants === 'undefined') u.equippedPants = null;
            if (!u.challengeClaims) u.challengeClaims = {};
            if (!u.challengeProgress) u.challengeProgress = { dayKey: '', partsPlaced: 0, publishes: 0, cityVisits: 0, gamesPlayed: 0, likesGiven: 0, friendsAdded: 0, messagesSent: 0, groupPosts: 0, purchases: 0 };
            if (!u.academyProgress) u.academyProgress = {};
            if (!u.academyClaims) u.academyClaims = {};
            if (!u.jamVotes) u.jamVotes = {};
            if (!u.blueprintFavorites) u.blueprintFavorites = [];

// Add this right after parsing db.json
if (typeof db.lastUserIdNum === 'undefined') {
    db.lastUserIdNum = 0;
    // Retroactively assign sequential IDs to existing users
    db.users.forEach(u => {
        if (typeof u.userIdNum === 'undefined') {
            db.lastUserIdNum++;
            u.userIdNum = db.lastUserIdNum;
        }
    });
}

            if (!u.bookmarks) u.bookmarks = []; 
            if (typeof u.equipped === 'undefined') u.equipped = null;
            if (!u.profileItems) u.profileItems = [];
            if (typeof u.equippedProfileTheme === 'undefined') u.equippedProfileTheme = null;
            if (typeof u.equippedProfileCosmetic === 'undefined') u.equippedProfileCosmetic = null;
            if (!Array.isArray(u.equippedProfileCosmetics)) u.equippedProfileCosmetics = (u.equippedProfileCosmetic ? [u.equippedProfileCosmetic] : []);
            if (!u.profilePinnedGame) u.profilePinnedGame = { enabled: false, gameId: null, description: '' };
            if (!u.profileWorld) u.profileWorld = { equipped: false, gameIds: [], assetIds: [], greeting: '' };
            if (typeof u.profileBio === 'undefined') u.profileBio = '';
            if (!u.profileTextStyle) u.profileTextStyle = { font: 'default', color: '#2c3e50' };
            if (typeof u.lastSeenAt === 'undefined') u.lastSeenAt = Date.now();
            if (typeof u.primaryGroupId === 'undefined') u.primaryGroupId = null; 
            if (typeof u.coins === 'undefined') u.coins = 0; // Migrate coins to backend
if (typeof u.trustPoints === 'undefined') u.trustPoints = 0;
if (typeof u.trustLevel === 'undefined') u.trustLevel = 1;
if (typeof u.lastTrustDailyAt === 'undefined') u.lastTrustDailyAt = 0;
if (typeof u.lastTrustGainAt === 'undefined') u.lastTrustGainAt = 0;
if (typeof u.lastSpinDate === 'undefined') u.lastSpinDate = 0; // NEW: Lucky Spin Tracker

if (typeof u.lastPlayDate === 'undefined') u.lastPlayDate = 0;
            if (typeof u.cityData === 'undefined') u.cityData = null; // NEW: Track if user is in Sculpt City
            if (u.cityData) {
                if (typeof u.cityData.tutorialComplete === 'undefined') u.cityData.tutorialComplete = false;
                if (typeof u.cityData.bucks !== 'undefined') {
                    u.coins = (u.coins || 0) + (u.cityData.bucks || 0);
                    delete u.cityData.bucks;
                }
            }

if (typeof u.loginStreak === 'undefined') u.loginStreak = 0;
            if (typeof u.lastLoginDate === 'undefined') u.lastLoginDate = 0;
            if (typeof u.playStreak === 'undefined') u.playStreak = 0;
            if (typeof u.lastPlayDate === 'undefined') u.lastPlayDate = 0;
            
            if (u.friends.length > 0 && typeof u.friends[0] === 'string') {
                u.friends = u.friends.map(id => ({ id, addedAt: Date.now() }));
            }
        });


        db.games.forEach(g => { 
            if (!g.collaborators) g.collaborators = []; 
            if (!g.lastEditTime) g.lastEditTime = 0;
            if (!g.likes) g.likes = [];
            if (typeof g.plays !== 'number') g.plays = 0;
            if (!g.updates) g.updates = []; 
if (!g.versions) g.versions = [{ versionId: 1, timestamp: g.createdAt ? new Date(g.createdAt).getTime() : Date.now(), gameData: g.gameData }];
            if (!g.genre) g.genre = 'Sandbox'; 
            // Database Migration for Analytics
if (!g.analytics) {
    g.analytics = {
        uniquePlayers: [],
        totalSessionTimeSeconds: 0,
        fallOffs: 0,
        peakCCU: 0,
        desktopSessions: 0,
        mobileSessions: 0,
        totalJumps: 0
    };
};
            if (typeof g.groupId === 'undefined') g.groupId = null;
        });

        // Migrate Groups to advanced roles system
        db.groups.forEach(gr => {
            if (typeof gr.level === 'undefined') gr.level = 1;
            if (typeof gr.xp === 'undefined') gr.xp = 0;
            if (typeof gr.logo === 'undefined') gr.logo = '';
            if (!gr.events) gr.events = [];

            if (!gr.affiliates) gr.affiliates = [];
            if (!gr.affiliateRequests) gr.affiliateRequests = [];
            if (!gr.enemies) gr.enemies = [];
            if (typeof gr.allowEnemies === 'undefined') gr.allowEnemies = false;
            if (!gr.polls) gr.polls = [];
            
            if (!gr.roles) {
                const rOwnerId = crypto.randomUUID();
                const rMemberId = crypto.randomUUID();
                gr.roles = [
                    { id: rOwnerId, name: 'Owner', rank: 255, perms: { manageRanks: true, kick: true, ban: true, editGames: true, deletePosts: true, manageCategories: true, manageEvents: true, managePayouts: true } },
                    { id: rMemberId, name: 'Member', rank: 1, perms: { manageRanks: false, kick: false, ban: false, editGames: false, deletePosts: false, manageCategories: false, manageEvents: false, managePayouts: false } }
                ];
                gr.members.forEach(m => {
                    if (m.role === 'Owner' || m.role === 'Admin') m.roleId = rOwnerId;
                    else m.roleId = rMemberId;
                    delete m.role;
                });
                gr.categories = [];
                gr.threads = [];
                gr.banned = [];
            } else {
                gr.roles.forEach(r => {
                    if (typeof r.perms.manageEvents === 'undefined') r.perms.manageEvents = r.rank === 255;
                    if (typeof r.perms.managePayouts === 'undefined') r.perms.managePayouts = r.rank === 255;
                });
            }
        });

    } catch (e) {
        console.error("Error loading db.json, starting fresh.");
    }
}
if (db.systemState && Number(db.systemState.restartUntil || 0) > Date.now()) {
    restartState = {
        active: true,
        startedAt: Date.now(),
        endsAt: Number(db.systemState.restartUntil || 0),
        message: String(db.systemState.restartMessage || RESTART_POPUP_TEXT)
    };
    const remaining = Math.max(0, restartState.endsAt - Date.now());
    setTimeout(() => finalizeSafeRestart(), remaining);
}

const saveDB = () => {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
};
const markLastSignup = (username, source = 'user') => {
    if (!db.systemState) db.systemState = { restartUntil: 0, restartMessage: '' };
    db.systemState.lastSignup = { username: String(username || '').slice(0, 80), at: Date.now(), source: String(source || 'user').slice(0, 20) };
};

// --- Security / Auth Helpers ---
const hashPassword = (password) => {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return { salt, hash };
};

const verifyPassword = (password, salt, hash) => {
    const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return hash === verifyHash;
};


const sanitizeText = (value, maxLen = 80) => String(value || '').replace(/[<>]/g, '').trim().slice(0, maxLen);
const sanitizeNumber = (value, fallback, min, max) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return fallback;
    return Math.max(min, Math.min(max, num));
};
const isSculptCityAccount = (user) => String(user?.username || '').toLowerCase() === 'sculpt city';

const TRUST_LEVELS = [
    { level: 1, name: 'New', tp: 0 }, { level: 2, name: 'Starter', tp: 20 }, { level: 3, name: 'Player', tp: 50 }, { level: 4, name: 'Active', tp: 90 }, { level: 5, name: 'Friendly', tp: 140 },
    { level: 6, name: 'Regular', tp: 200 }, { level: 7, name: 'Known', tp: 270 }, { level: 8, name: 'Positive', tp: 350 }, { level: 9, name: 'Rising', tp: 440 }, { level: 10, name: 'Verified', tp: 550 },
    { level: 11, name: 'Trusted', tp: 700 }, { level: 12, name: 'Steady', tp: 880 }, { level: 13, name: 'Social', tp: 1100 }, { level: 14, name: 'Reliable', tp: 1360 }, { level: 15, name: 'Solid', tp: 1660 },
    { level: 16, name: 'Good', tp: 2000 }, { level: 17, name: 'Supportive', tp: 2380 }, { level: 18, name: 'Safe', tp: 2800 }, { level: 19, name: 'Strong', tp: 3260 }, { level: 20, name: 'Proven', tp: 3760 },
    { level: 21, name: 'Builder', tp: 4400 }, { level: 22, name: 'Maker', tp: 5100 }, { level: 23, name: 'Creator', tp: 5900 }, { level: 24, name: 'Designer', tp: 6800 }, { level: 25, name: 'Skilled', tp: 7800 },
    { level: 26, name: 'Advanced', tp: 8900 }, { level: 27, name: 'Expert', tp: 10100 }, { level: 28, name: 'Elite', tp: 11400 }, { level: 29, name: 'Top', tp: 12800 }, { level: 30, name: 'Creator+', tp: 14300 },
    { level: 31, name: 'Leader', tp: 16000 }, { level: 32, name: 'Guide', tp: 17800 }, { level: 33, name: 'Helper', tp: 19800 }, { level: 34, name: 'Mentor', tp: 22000 }, { level: 35, name: 'Core', tp: 24500 },
    { level: 36, name: 'Pillar', tp: 27300 }, { level: 37, name: 'Trusted+', tp: 30400 }, { level: 38, name: 'Influencer', tp: 33800 }, { level: 39, name: 'Major', tp: 37500 }, { level: 40, name: 'Community', tp: 41500 },
    { level: 41, name: 'Watcher', tp: 46000 }, { level: 42, name: 'Protector', tp: 51000 }, { level: 43, name: 'Guard', tp: 56500 }, { level: 44, name: 'Defender', tp: 62500 }, { level: 45, name: 'Keeper', tp: 69000 },
    { level: 46, name: 'Sentinel', tp: 76000 }, { level: 47, name: 'Elite Guard', tp: 83500 }, { level: 48, name: 'Master', tp: 91500 }, { level: 49, name: 'Legend', tp: 100000 }, { level: 50, name: 'Guardian', tp: 110000 }
];
const getTrustLevelMeta = (tp = 0) => {
    let selected = TRUST_LEVELS[0];
    for (const row of TRUST_LEVELS) {
        if (tp >= row.tp) selected = row;
        else break;
    }
    return { level: selected.level, name: selected.name, threshold: selected.tp };
};
const normalizeUserTrust = (user) => {
    if (!user) return { trustPoints: 0, trustLevel: 1, trustLevelName: 'New' };
    if (typeof user.trustPoints !== 'number' || !Number.isFinite(user.trustPoints)) user.trustPoints = 0;
    const meta = getTrustLevelMeta(user.trustPoints);
    user.trustLevel = meta.level;
    return { trustPoints: user.trustPoints, trustLevel: meta.level, trustLevelName: meta.name };
};
const hasActiveReportsAgainst = (userId) => (db.reports || []).some(r =>
    String(r.targetId || '') === String(userId) &&
    ['user_profile', 'user', 'in_game_player'].includes(String(r.targetType || '')) &&
    String(r.status || 'pending') !== 'deny'
);
const applyTrustPoints = (user, delta = 0, reason = '') => {
    if (!user || !Number.isFinite(delta) || delta === 0) return normalizeUserTrust(user);
    user.trustPoints = Number(user.trustPoints || 0) + Number(delta);
    user.lastTrustGainAt = Date.now();
    if (!Array.isArray(user.trustHistory)) user.trustHistory = [];
    user.trustHistory.push({ id: crypto.randomUUID(), delta: Number(delta), reason: String(reason || ''), at: Date.now() });
    if (user.trustHistory.length > 40) user.trustHistory.splice(0, user.trustHistory.length - 40);
    return normalizeUserTrust(user);
};
const maybeAwardTrustDaily = (user) => {
    if (!user) return false;
    const now = Date.now();
    if (hasActiveReportsAgainst(user.id)) return false;
    const last = Number(user.lastTrustDailyAt || 0);
    if ((now - last) < 24 * 60 * 60 * 1000) return false;
    applyTrustPoints(user, 5, 'SculptShield daily clean account bonus');
    user.lastTrustDailyAt = now;
    return true;
};
const awardGameplayTrustIfEligible = (user, position = {}) => {
    if (!user) return false;
    const now = Date.now();
    const state = trustPlayState[user.id] || {
        lastPos: null,
        lastMoveAt: now,
        lastAwardAt: Number(user.lastTrustGainAt || 0),
        lastDailyAt: Number(user.lastTrustDailyAt || 0)
    };
    const px = Number(position.x) || 0, py = Number(position.y) || 0, pz = Number(position.z) || 0, rotY = Number(position.rotY) || 0;
    const lp = state.lastPos;
    const moved = !lp || Math.hypot(px - lp.x, py - lp.y, pz - lp.z) > 0.32 || Math.abs(rotY - lp.rotY) > 0.12;
    if (moved) state.lastMoveAt = now;
    state.lastPos = { x: px, y: py, z: pz, rotY };

    const activeRecently = (now - Number(state.lastMoveAt || 0)) <= 90 * 1000;
    const canAward = (now - Number(state.lastAwardAt || 0)) >= 10 * 60 * 1000;
    if (activeRecently && canAward && !hasActiveReportsAgainst(user.id)) {
        applyTrustPoints(user, 2, 'SculptShield active play bonus');
        state.lastAwardAt = now;
        user.lastTrustGainAt = now;
        trustPlayState[user.id] = state;
        return true;
    }

    trustPlayState[user.id] = state;
    return false;
};

const NBT_TAG = {
    END: 0, BYTE: 1, SHORT: 2, INT: 3, LONG: 4, FLOAT: 5, DOUBLE: 6, BYTE_ARRAY: 7, STRING: 8, LIST: 9, COMPOUND: 10, INT_ARRAY: 11, LONG_ARRAY: 12
};
const readNBT = (buffer) => {
    let o = 0;
    const readU8 = () => buffer.readUInt8(o++);
    const readI8 = () => buffer.readInt8(o++);
    const readI16 = () => { const v = buffer.readInt16BE(o); o += 2; return v; };
    const readU16 = () => { const v = buffer.readUInt16BE(o); o += 2; return v; };
    const readI32 = () => { const v = buffer.readInt32BE(o); o += 4; return v; };
    const readI64 = () => {
        const hi = BigInt(buffer.readInt32BE(o));
        const lo = BigInt(buffer.readUInt32BE(o + 4));
        o += 8;
        return (hi << 32n) | lo;
    };
    const readF32 = () => { const v = buffer.readFloatBE(o); o += 4; return v; };
    const readF64 = () => { const v = buffer.readDoubleBE(o); o += 8; return v; };
    const readStr = () => {
        const len = readU16();
        const v = buffer.toString('utf8', o, o + len);
        o += len;
        return v;
    };
    const readPayload = (tagType) => {
        switch (tagType) {
            case NBT_TAG.BYTE: return readI8();
            case NBT_TAG.SHORT: return readI16();
            case NBT_TAG.INT: return readI32();
            case NBT_TAG.LONG: return readI64();
            case NBT_TAG.FLOAT: return readF32();
            case NBT_TAG.DOUBLE: return readF64();
            case NBT_TAG.BYTE_ARRAY: {
                const len = readI32();
                const arr = Buffer.alloc(Math.max(0, len));
                buffer.copy(arr, 0, o, o + len);
                o += len;
                return arr;
            }
            case NBT_TAG.STRING: return readStr();
            case NBT_TAG.LIST: {
                const listType = readU8();
                const len = readI32();
                const arr = [];
                for (let i = 0; i < len; i++) arr.push(readPayload(listType));
                return arr;
            }
            case NBT_TAG.COMPOUND: {
                const out = {};
                while (true) {
                    const t = readU8();
                    if (t === NBT_TAG.END) break;
                    const name = readStr();
                    out[name] = readPayload(t);
                }
                return out;
            }
            case NBT_TAG.INT_ARRAY: {
                const len = readI32();
                const arr = new Array(len);
                for (let i = 0; i < len; i++) arr[i] = readI32();
                return arr;
            }
            case NBT_TAG.LONG_ARRAY: {
                const len = readI32();
                const arr = new Array(len);
                for (let i = 0; i < len; i++) arr[i] = readI64();
                return arr;
            }
            default:
                throw new Error(`Unsupported NBT tag type: ${tagType}`);
        }
    };

    const rootType = readU8();
    if (rootType !== NBT_TAG.COMPOUND) throw new Error('Invalid NBT root type.');
    const rootName = readStr();
    const rootValue = readPayload(rootType);
    return { rootName, value: rootValue };
};

const decodeVarIntStream = (buf, maxCount) => {
    const values = [];
    let offset = 0;
    while (offset < buf.length && values.length < maxCount) {
        let num = 0;
        let shift = 0;
        let b;
        let loops = 0;
        do {
            if (offset >= buf.length) throw new Error('Malformed varint stream.');
            b = buf[offset++];
            num |= (b & 0x7F) << shift;
            shift += 7;
            loops++;
            if (loops > 5) throw new Error('VarInt too long.');
        } while (b & 0x80);
        values.push(num >>> 0);
    }
    return values;
};

const buildObjFromSchematic = (buffer) => {
    const raw = (buffer[0] === 0x1f && buffer[1] === 0x8b) ? require('zlib').gunzipSync(buffer) : buffer;
    const parsed = readNBT(raw).value || {};
    const schem = parsed.Schematic || parsed;
    const toNum = (v, fallback = 0) => {
        if (typeof v === 'bigint') return Number(v);
        const n = Number(v);
        return Number.isFinite(n) ? n : fallback;
    };
    let width = toNum(schem.Width ?? schem.width, 0);
    let height = toNum(schem.Height ?? schem.height, 0);
    let length = toNum(schem.Length ?? schem.length, 0);
    let blockIds = [];
    let blockNameAt = null;
    const decodeVarIntOrArray = (data, total) => Buffer.isBuffer(data)
        ? decodeVarIntStream(data, total)
        : (Array.isArray(data) ? data.map(v => toNum(v, 0)).slice(0, total) : []);
    const decodePackedStates = (longs, count, bitsPerBlock) => {
        const out = new Array(count).fill(0);
        const mask = (1n << BigInt(bitsPerBlock)) - 1n;
        for (let i = 0; i < count; i++) {
            const bitIndex = BigInt(i * bitsPerBlock);
            const longIdx = Number(bitIndex / 64n);
            const bitOffset = Number(bitIndex % 64n);
            const lo = BigInt.asUintN(64, BigInt(longs[longIdx] || 0n));
            if (bitOffset + bitsPerBlock <= 64) {
                out[i] = Number((lo >> BigInt(bitOffset)) & mask);
            } else {
                const hi = BigInt.asUintN(64, BigInt(longs[longIdx + 1] || 0n));
                const lowPart = lo >> BigInt(bitOffset);
                const highBits = BigInt(bitOffset + bitsPerBlock - 64);
                const highPart = (hi & ((1n << highBits) - 1n)) << BigInt(64 - bitOffset);
                out[i] = Number((lowPart | highPart) & mask);
            }
        }
        return out;
    };
    const applyPaletteBlockDataFormat = (paletteObj, blockData, total) => {
        if (!paletteObj || typeof paletteObj !== 'object' || !blockData) return false;
        const inversePalette = {};
        Object.keys(paletteObj).forEach(name => { inversePalette[toNum(paletteObj[name], 0)] = name; });
        blockIds = decodeVarIntOrArray(blockData, total);
        blockNameAt = (idx) => String(inversePalette[idx] || 'minecraft:air');
        return blockIds.length > 0;
    };

    const palette = schem.Palette || null;
    const blockDataRaw = schem.BlockData;
    let blockTotal = Math.max(0, width * height * length);
    if (!applyPaletteBlockDataFormat(palette, blockDataRaw, blockTotal) && applyPaletteBlockDataFormat(schem?.Blocks?.Palette, schem?.Blocks?.Data || schem?.Blocks?.BlockData, blockTotal)) {
        // Nested Blocks compound format.
    } else if (Buffer.isBuffer(schem.Blocks) || Array.isArray(schem.Blocks)) {
        // Legacy MCEdit style format support.
        const blocksBase = Buffer.isBuffer(schem.Blocks) ? Array.from(schem.Blocks.values()) : schem.Blocks.map(v => Number(v) || 0);
        const add = (Buffer.isBuffer(schem.AddBlocks) || Array.isArray(schem.AddBlocks))
            ? (Buffer.isBuffer(schem.AddBlocks) ? Array.from(schem.AddBlocks.values()) : schem.AddBlocks.map(v => Number(v) || 0))
            : null;
        blockIds = new Array(Math.min(blockTotal, blocksBase.length)).fill(0).map((_, i) => {
            const base = blocksBase[i] & 0xFF;
            if (!add || i >= add.length * 2) return base;
            const nibbleByte = add[Math.floor(i / 2)] & 0xFF;
            const hi = (i % 2 === 0) ? (nibbleByte & 0x0F) : ((nibbleByte >> 4) & 0x0F);
            return base | (hi << 8);
        });
        blockNameAt = (idx) => idx === 0 ? 'minecraft:air' : `legacy:block_${idx}`;
    } else if (schem.Regions && typeof schem.Regions === 'object' && Object.keys(schem.Regions).length > 0) {
        // Litematic-like region storage fallback.
        const firstRegion = schem.Regions[Object.keys(schem.Regions)[0]] || {};
        const sx = toNum(firstRegion?.Size?.x, 0);
        const sy = toNum(firstRegion?.Size?.y, 0);
        const sz = toNum(firstRegion?.Size?.z, 0);
        width = Math.abs(sx); height = Math.abs(sy); length = Math.abs(sz);
        blockTotal = Math.max(0, width * height * length);
        const paletteList = firstRegion.BlockStatePalette || [];
        const statePalette = {};
        if (Array.isArray(paletteList)) {
            paletteList.forEach((entry, i) => {
                if (typeof entry === 'string') statePalette[i] = entry;
                else if (entry && typeof entry === 'object' && entry.Name) statePalette[i] = String(entry.Name);
            });
        } else if (firstRegion.Palette && typeof firstRegion.Palette === 'object') {
            Object.keys(firstRegion.Palette).forEach(name => { statePalette[toNum(firstRegion.Palette[name], 0)] = name; });
        }
        const longs = Array.isArray(firstRegion.BlockStates) ? firstRegion.BlockStates : [];
        const bitsPerBlock = Math.max(2, Math.ceil(Math.log2(Math.max(2, Object.keys(statePalette).length))));
        if (longs.length && blockTotal > 0) {
            blockIds = decodePackedStates(longs, blockTotal, bitsPerBlock);
            blockNameAt = (idx) => String(statePalette[idx] || 'minecraft:air');
        }
    }
    if (!width || !height || !length) throw new Error('Missing Width/Height/Length in schematic.');
    if (!blockIds.length) throw new Error('Missing or unsupported block data format (expected Palette+BlockData, nested Blocks data, Blocks array, or Regions BlockStates).');
    if (blockIds.length < blockTotal) {
        const fixed = new Array(blockTotal).fill(0);
        for (let i = 0; i < Math.min(blockIds.length, blockTotal); i++) fixed[i] = blockIds[i];
        blockIds = fixed;
    } else if (blockIds.length > blockTotal) {
        blockIds = blockIds.slice(0, blockTotal);
    }
    if (!blockNameAt) blockNameAt = (idx) => idx === 0 ? 'minecraft:air' : `block_${idx}`;

    const toIndex = (x, y, z) => y * width * length + z * width + x;
    const isSolid = (x, y, z) => {
        if (x < 0 || y < 0 || z < 0 || x >= width || y >= height || z >= length) return false;
        const name = blockNameAt(blockIds[toIndex(x, y, z)]);
        return !name.endsWith(':air') && !name.includes('air[');
    };

    const lines = ['# Generated from .schem by Playsculpt', 'mtllib schem.mtl'];
    let vertexBase = 1;
    let blocksIncluded = 0;
    const maxBlocks = 12000;
    for (let y = 0; y < height; y++) {
        for (let z = 0; z < length; z++) {
            for (let x = 0; x < width; x++) {
                const idx = toIndex(x, y, z);
                const name = blockNameAt(blockIds[idx]);
                if (name.endsWith(':air') || name.includes('air[')) continue;
                const exposed =
                    !isSolid(x + 1, y, z) || !isSolid(x - 1, y, z) ||
                    !isSolid(x, y + 1, z) || !isSolid(x, y - 1, z) ||
                    !isSolid(x, y, z + 1) || !isSolid(x, y, z - 1);
                if (!exposed) continue;
                blocksIncluded++;
                if (blocksIncluded > maxBlocks) break;
                lines.push(`o b_${x}_${y}_${z}`);
                lines.push(`v ${x} ${y} ${z}`);
                lines.push(`v ${x + 1} ${y} ${z}`);
                lines.push(`v ${x + 1} ${y + 1} ${z}`);
                lines.push(`v ${x} ${y + 1} ${z}`);
                lines.push(`v ${x} ${y} ${z + 1}`);
                lines.push(`v ${x + 1} ${y} ${z + 1}`);
                lines.push(`v ${x + 1} ${y + 1} ${z + 1}`);
                lines.push(`v ${x} ${y + 1} ${z + 1}`);
                lines.push(`usemtl ${name.replace(/[^a-zA-Z0-9_\-:.]/g, '_')}`);
                if (!isSolid(x, y, z - 1)) lines.push(`f ${vertexBase} ${vertexBase + 1} ${vertexBase + 2} ${vertexBase + 3}`);
                if (!isSolid(x, y, z + 1)) lines.push(`f ${vertexBase + 5} ${vertexBase + 4} ${vertexBase + 7} ${vertexBase + 6}`);
                if (!isSolid(x - 1, y, z)) lines.push(`f ${vertexBase + 4} ${vertexBase} ${vertexBase + 3} ${vertexBase + 7}`);
                if (!isSolid(x + 1, y, z)) lines.push(`f ${vertexBase + 1} ${vertexBase + 5} ${vertexBase + 6} ${vertexBase + 2}`);
                if (!isSolid(x, y + 1, z)) lines.push(`f ${vertexBase + 3} ${vertexBase + 2} ${vertexBase + 6} ${vertexBase + 7}`);
                if (!isSolid(x, y - 1, z)) lines.push(`f ${vertexBase + 4} ${vertexBase + 5} ${vertexBase + 1} ${vertexBase}`);
                vertexBase += 8;
            }
            if (blocksIncluded > maxBlocks) break;
        }
        if (blocksIncluded > maxBlocks) break;
    }
    if (!blocksIncluded) throw new Error('Schematic had no solid blocks to import.');
    return { objText: lines.join('\n'), blocksIncluded: Math.min(blocksIncluded, maxBlocks), truncated: blocksIncluded > maxBlocks };
};

const sanitizeGameData = (gameData) => {
    const MAX_WORLD_OBJECTS = 50000;
    const MAX_UI_LAYOUT_ITEMS = 1000;
    const nostalgiaDefaults = {
        gravity: 0.08,
        skyColor: '#8dc8ff',
        brightness: 0.78,
        sunIntensity: 0.88,
        fogDistance: 980,
        graphicsQuality: 'high',
        exposure: 0.98
    };
    const safe = {
        settings: {
            gravity: sanitizeNumber(gameData?.settings?.gravity, nostalgiaDefaults.gravity, 0, 5),
            skyColor: /^#[0-9a-fA-F]{6}$/.test(gameData?.settings?.skyColor || '') ? gameData.settings.skyColor : nostalgiaDefaults.skyColor,
            brightness: sanitizeNumber(gameData?.settings?.brightness, nostalgiaDefaults.brightness, 0.1, 3),
            sunIntensity: sanitizeNumber(gameData?.settings?.sunIntensity, nostalgiaDefaults.sunIntensity, 0.2, 2),
            fogDistance: sanitizeNumber(gameData?.settings?.fogDistance, nostalgiaDefaults.fogDistance, 200, 3000),
            graphicsQuality: ['high', 'ultra'].includes(gameData?.settings?.graphicsQuality) ? gameData.settings.graphicsQuality : nostalgiaDefaults.graphicsQuality,
            exposure: sanitizeNumber(gameData?.settings?.exposure, nostalgiaDefaults.exposure, 0.4, 2.5),
            globalShadows: gameData?.settings?.globalShadows !== false,
            graphicsProfileVersion: Number.isFinite(Number(gameData?.settings?.graphicsProfileVersion)) ? Number(gameData.settings.graphicsProfileVersion) : 1
        },
        spawn: gameData?.spawn ? {
            x: sanitizeNumber(gameData.spawn.x, 0, -5000, 5000),
            y: sanitizeNumber(gameData.spawn.y, 2, -5000, 5000),
            z: sanitizeNumber(gameData.spawn.z, 0, -5000, 5000),
            scale: {
                x: sanitizeNumber(gameData.spawn.scale?.x, 4, 0.1, 200),
                y: sanitizeNumber(gameData.spawn.scale?.y, 1, 0.1, 200),
                z: sanitizeNumber(gameData.spawn.scale?.z, 4, 0.1, 200)
            }
        } : { x: 0, y: 2, z: 0, scale: { x: 4, y: 1, z: 4 } },
        objects: [],
        uiLayout: Array.isArray(gameData?.uiLayout) ? gameData.uiLayout.slice(0, MAX_UI_LAYOUT_ITEMS) : []
    };

    const objects = Array.isArray(gameData?.objects) ? gameData.objects.slice(0, MAX_WORLD_OBJECTS) : [];
    objects.forEach((obj) => {
        if (!obj || typeof obj !== 'object') return;
        const cleanObj = {
            id: typeof obj.id === 'string' ? obj.id.slice(0, 80) : crypto.randomUUID(),
            ownerId: typeof obj.ownerId === 'string' ? obj.ownerId.slice(0, 80) : undefined,
            name: sanitizeText(obj.name || obj.type || 'Object', 48),
            type: sanitizeText(obj.type || 'block', 24),
            position: {
                x: sanitizeNumber(obj.position?.x, 0, -10000, 10000),
                y: sanitizeNumber(obj.position?.y, 0, -10000, 10000),
                z: sanitizeNumber(obj.position?.z, 0, -10000, 10000)
            },
            rotation: {
                x: sanitizeNumber(obj.rotation?.x, 0, -Math.PI * 4, Math.PI * 4),
                y: sanitizeNumber(obj.rotation?.y, 0, -Math.PI * 4, Math.PI * 4),
                z: sanitizeNumber(obj.rotation?.z, 0, -Math.PI * 4, Math.PI * 4)
            },
            scale: {
                x: sanitizeNumber(obj.scale?.x, 1, 0.05, 500),
                y: sanitizeNumber(obj.scale?.y, 1, 0.05, 500),
                z: sanitizeNumber(obj.scale?.z, 1, 0.05, 500)
            },
            color: /^#[0-9a-fA-F]{6}$/.test(obj.color || '') ? obj.color : '#3498db',
            material: sanitizeText(obj.material || 'Plastic', 24),
            script: String(obj.script || '').slice(0, 12000),
            objSource: String(obj.objSource || '').slice(0, 12000000),
            objMtl: String(obj.objMtl || '').slice(0, 2000000),
            objTextureMap: {},
            isAnchored: obj.isAnchored !== false,
            canCollide: obj.canCollide !== false,
            noCollide: !!obj.noCollide,
            castsShadow: obj.castsShadow !== false && String(obj.type || '').trim() !== 'floatingText'
        };

        if (obj.smart && typeof obj.smart === 'object') {
            cleanObj.smart = {
                kind: sanitizeText(obj.smart.kind || 'custom', 24),
                title: sanitizeText(obj.smart.title || cleanObj.name, 40),
                power: sanitizeNumber(obj.smart.power, 0, 0, 1000),
                range: sanitizeNumber(obj.smart.range, 4, 1, 30),
                team: ['all', 'red', 'blue', 'neutral'].includes(obj.smart.team) ? obj.smart.team : 'all',
                advanced: !!obj.smart.advanced
            };
        }
        if (obj.objTextureMap && typeof obj.objTextureMap === 'object') {
            const entries = Object.entries(obj.objTextureMap).slice(0, 64);
            entries.forEach(([k, v]) => {
                const key = String(k || '').slice(0, 120);
                const value = String(v || '').slice(0, 6000000);
                if (key) cleanObj.objTextureMap[key] = value;
            });
        }
        safe.objects.push(cleanObj);
    });

    return safe;
};

function createNotification(userId, type, data) {
    db.notifications.push({
        id: crypto.randomUUID(),
        userId,
        type, // "invite", "friend_request", "message"
        data,
        read: false,
        createdAt: Date.now()
    });
    saveDB();
}

const requireAuth = (req, res, next) => {
    const token = req.headers.authorization;
    if (!token || !db.sessions[token]) {
        return res.status(401).json({ error: 'Unauthorized. Please log in.' });
    }
    req.userId = db.sessions[token];

if (typeof onlineUsers[req.userId] === 'object') {
        onlineUsers[req.userId].lastSeen = Date.now();
    } else {
        onlineUsers[req.userId] = { lastSeen: Date.now(), location: 'website' };
    }
    const reqUser = db.users.find(u => u.id === req.userId);
    if (reqUser) reqUser.lastSeenAt = Date.now();
    next();
};
const inviteCooldowns = {}; 

const isUserOnline = (userId) => {
    const slot = onlineUsers[userId];
    if (!slot) return false;
    if (typeof slot === 'number') return (Date.now() - slot) < 15000;
    if (typeof slot.lastSeen === 'number') return (Date.now() - slot.lastSeen) < 15000;
    return false;
};
const getUserLastSeenAt = (userId) => {
    const slot = onlineUsers[userId];
    if (typeof slot === 'number') return slot;
    if (slot && typeof slot.lastSeen === 'number') return slot.lastSeen;
    const user = db.users.find(u => u.id === userId);
    return (user && user.lastSeenAt) ? user.lastSeenAt : Date.now();
};

const isPrimaryAdmin = (user) => !!user && String(user.username || '').toLowerCase() === 'admin';
const CHAT_LOG_ADMIN_USERS = new Set(['admin', 'nick', 'austin']);
const ECONOMY_ADMIN_USERS = new Set(['admin', 'nick', 'austin']);
const canViewChatLogs = (user) => !!user && CHAT_LOG_ADMIN_USERS.has(String(user.username || '').toLowerCase());
const canUseEconomyAdmin = (user) => !!user && ECONOMY_ADMIN_USERS.has(String(user.username || '').toLowerCase());

const appendChatLog = (entry = {}) => {
    if (!db.chatLogs) db.chatLogs = [];
    const now = Date.now();
    const textNorm = String(entry.text || '').trim().toLowerCase();
    const recentDup = db.chatLogs.slice(-12).find((m) =>
        String(m.channel || '') === String(entry.channel || '') &&
        String(m.authorId || '') === String(entry.authorId || '') &&
        String(m.sourceId || '') === String(entry.sourceId || '') &&
        String(m.text || '').trim().toLowerCase() === textNorm &&
        (now - (Number(m.timestamp) || 0)) < 3000
    );
    if (recentDup) return;
    const record = {
        id: crypto.randomUUID(),
        timestamp: Number(entry.timestamp) || Date.now(),
        channel: String(entry.channel || 'unknown').slice(0, 40),
        sourceType: String(entry.sourceType || '').slice(0, 40),
        sourceId: entry.sourceId ? String(entry.sourceId).slice(0, 120) : null,
        gameId: entry.gameId ? String(entry.gameId).slice(0, 120) : null,
        groupId: entry.groupId ? String(entry.groupId).slice(0, 120) : null,
        authorId: entry.authorId ? String(entry.authorId).slice(0, 120) : null,
        authorName: String(entry.authorName || 'Unknown').slice(0, 60),
        text: String(entry.text || '').slice(0, 600),
        meta: entry.meta && typeof entry.meta === 'object' ? entry.meta : {}
    };
    db.chatLogs.push(record);
    if (db.chatLogs.length > 50000) db.chatLogs.splice(0, db.chatLogs.length - 50000);
};

const isLikelyDuplicateMessage = (messages = [], userId, text, windowMs = 1400) => {
    const normalized = String(text || '').trim().toLowerCase();
    if (!normalized || !Array.isArray(messages) || !messages.length) return false;
    const now = Date.now();
    for (let i = messages.length - 1; i >= 0; i--) {
        const m = messages[i];
        if (!m) continue;
        if ((now - (Number(m.timestamp) || 0)) > windowMs) break;
        const sameUser = (m.userId && m.userId === userId) || (m.authorId && m.authorId === userId);
        if (!sameUser) continue;
        if (String(m.text || '').trim().toLowerCase() === normalized) return true;
    }
    return false;
};

const touchGameServer = (gameId) => {
    if (!gameId) return;
    gameServerLastSeen[gameId] = Date.now();
};
const clearGameServerState = (gameId) => {
    if (!gameId) return;
    delete activePlayers[gameId];
    delete activePlayDynamic[gameId];
    delete gameChats[gameId];
    delete gameServerLastSeen[gameId];
    for (const key in gameChatActivity) if (key.startsWith(gameId + '_')) delete gameChatActivity[key];
    for (const key in gameChatSuspensions) if (key.startsWith(gameId + '_')) delete gameChatSuspensions[key];
};
const cleanupGameServerIfInactive = (gameId, maxIdleMs = 15000) => {
    if (!gameId) return;
    const now = Date.now();
    const players = activePlayers[gameId] || {};
    const hasFreshPlayers = Object.values(players).some(p => now - (p.timestamp || 0) < 3500);
    if (hasFreshPlayers) {
        touchGameServer(gameId);
        return;
    }
    const lastSeen = gameServerLastSeen[gameId] || 0;
    if ((now - lastSeen) > maxIdleMs) clearGameServerState(gameId);
};
const emitSystemEvent = (type, payload = {}) => {
    const eventData = `data: ${JSON.stringify({ type, ...payload })}\n\n`;
    systemEventClients.forEach((res) => {
        try { res.write(eventData); } catch (_) {}
    });
};
const finalizeSafeRestart = () => {
    activeEditors = {};
    activePlayers = {};
    activePlayDynamic = {};
    gameChats = {};
    gameChatActivity = {};
    gameChatSuspensions = {};
    gameServerLastSeen = {};
    restartState = { active: false, startedAt: 0, endsAt: 0, message: '' };
    db.systemState = { restartUntil: 0, restartMessage: '' };
    saveDB();
    emitSystemEvent('restart_complete', {});
};
const performProcessRestart = () => {
    try {
        const child = spawn(process.execPath, process.argv.slice(1), {
            cwd: process.cwd(),
            env: process.env,
            detached: true,
            stdio: 'ignore'
        });
        child.unref();
    } catch (err) {
        console.error('Safe restart spawn failed:', err);
        return;
    }
    if (httpServer) {
        httpServer.close(() => process.exit(0));
        setTimeout(() => process.exit(0), 4500);
    } else {
        setTimeout(() => process.exit(0), 1000);
    }
};
const triggerSafeServerRestart = (actorName = 'system') => {
    const now = Date.now();
    const durationMs = 10000;
    restartState = {
        active: true,
        startedAt: now,
        endsAt: now + durationMs,
        message: RESTART_POPUP_TEXT,
        actor: actorName
    };
    db.systemState = { restartUntil: restartState.endsAt, restartMessage: restartState.message };
    saveDB();
    emitSystemEvent('restart_start', { endsAt: restartState.endsAt, message: restartState.message, actor: actorName });
    setTimeout(() => performProcessRestart(), 1500);
    setTimeout(() => finalizeSafeRestart(), durationMs);
};

const deleteUserAccountCompletely = (user) => {
    if (!user) return;
    const userId = user.id;
    const username = user.username;
    const usernameLower = String(username || '').toLowerCase();

    db.users = db.users.filter(u => u.id !== userId);
    Object.keys(db.sessions || {}).forEach(token => {
        if (db.sessions[token] === userId) delete db.sessions[token];
    });
    delete onlineUsers[userId];
    delete chatActivity[userId];
    delete chatSuspensions[userId];
    delete db.friendPetDaily[userId];
    if (db.moderation?.bans) delete db.moderation.bans[userId];
    if (db.moderation?.warnings) delete db.moderation.warnings[userId];

    db.notifications = (db.notifications || []).filter(n => n.userId !== userId);
    db.reports = (db.reports || []).filter(r => {
        const byUser = String(r.reporterId || '').toLowerCase() === String(userId).toLowerCase() || String(r.reporterName || '').toLowerCase() === usernameLower;
        const targetUser = String(r.targetType || '').toLowerCase().includes('user') && (String(r.targetId || '').toLowerCase() === String(userId).toLowerCase() || String(r.targetName || '').toLowerCase() === usernameLower);
        return !byUser && !targetUser;
    });

    (db.users || []).forEach(other => {
        other.friends = (other.friends || []).filter(f => (typeof f === 'string' ? f : f.id) !== userId);
        other.friendRequests = (other.friendRequests || []).filter(r => r !== username);
        other.followers = (other.followers || []).filter(f => f !== username);
        other.messages = (other.messages || []).filter(m => String(m.fromUsername || '').toLowerCase() !== usernameLower);
        if (other.primaryGroupId && !(db.groups || []).some(g => g.id === other.primaryGroupId)) other.primaryGroupId = null;
    });

    db.games = (db.games || []).filter(g => g.authorId !== userId);
    (db.games || []).forEach(g => {
        g.collaborators = (g.collaborators || []).filter(id => id !== userId);
        g.likes = (g.likes || []).filter(id => id !== userId);
        if (g.analytics?.uniquePlayers) g.analytics.uniquePlayers = g.analytics.uniquePlayers.filter(id => id !== userId);
    });
    db.shopItems = (db.shopItems || []).filter(i => i.authorId !== userId);
    db.clothingItems = (db.clothingItems || []).filter(i => i.authorId !== userId);
    db.toolboxItems = (db.toolboxItems || []).filter(i => i.authorId !== userId);
    db.blueprints = (db.blueprints || []).filter(b => b.authorId !== userId);

    (db.groups || []).forEach(group => {
        group.members = (group.members || []).filter(m => m.userId !== userId);
        group.banned = (group.banned || []).filter(b => b.userId !== userId);
        group.posts = (group.posts || []).filter(p => p.authorId !== userId);
        group.threads = (group.threads || []).filter(t => t.authorId !== userId);
        (group.threads || []).forEach(t => {
            t.replies = (t.replies || []).filter(r => r.authorId !== userId);
        });
        group.events = (group.events || []).filter(ev => ev.creatorId !== userId);
        if (group.ownerId === userId && group.members.length > 0) {
            group.ownerId = group.members[0].userId;
        }
    });
};


const getFriendLink = (user, friendId) => {
    if (!user || !Array.isArray(user.friends)) return null;
    return user.friends.find(f => f.id === friendId) || null;
};

const ensureFriendLink = (user, friendId) => {
    if (!user.friends) user.friends = [];
    let link = user.friends.find(f => f.id === friendId);
    if (!link) {
        link = { id: friendId, addedAt: Date.now(), xp: 0, level: 0, rewardTier: 0, lastXpAt: 0, rewards: { lvl10: false, lvl20: false, lvl50: false, lvl100: false }, petUnlocked: false };
        user.friends.push(link);
    }
    if (typeof link.xp !== 'number') link.xp = 0;
    if (typeof link.level !== 'number') link.level = Math.floor(link.xp / 100);
    if (typeof link.rewardTier !== 'number') link.rewardTier = Math.floor(link.level / 10);
    if (typeof link.lastXpAt !== 'number') link.lastXpAt = 0;
    if (!link.rewards) link.rewards = { lvl10: false, lvl20: false, lvl50: false, lvl100: false };
    if (typeof link.petUnlocked !== 'boolean') link.petUnlocked = false;
    return link;
};

const grantFriendshipXp = (userId, friendId, amount = 5) => {
    const user = db.users.find(u => u.id === userId);
    const friend = db.users.find(u => u.id === friendId);
    if (!user || !friend) return;

    const now = Date.now();
    const linkA = ensureFriendLink(user, friendId);
    const linkB = ensureFriendLink(friend, userId);

    if (now - linkA.lastXpAt < 30000) return; // throttle

    linkA.xp += amount;
    linkB.xp += amount;
    linkA.level = Math.floor(linkA.xp / 100);
    linkB.level = Math.floor(linkB.xp / 100);
    linkA.lastXpAt = now;
    linkB.lastXpAt = now;

    const applyMilestone = (lvl, coins, rewardKey, extra = null) => {
        if (linkA.level >= lvl && !linkA.rewards[rewardKey]) {
            user.coins = (user.coins || 0) + coins;
            linkA.rewards[rewardKey] = true;
            if (extra === 'pet') linkA.petUnlocked = true;
            if (extra === 'spin') {
                const spinReward = Math.random() < 0.5 ? 1500 : 2500;
                user.coins += spinReward;
                linkA.lastSpinReward = spinReward;
            }
        }
        if (linkB.level >= lvl && !linkB.rewards[rewardKey]) {
            friend.coins = (friend.coins || 0) + coins;
            linkB.rewards[rewardKey] = true;
            if (extra === 'pet') linkB.petUnlocked = true;
            if (extra === 'spin') {
                const reward = linkA.lastSpinReward || (Math.random() < 0.5 ? 1500 : 2500);
                friend.coins += reward;
                linkB.lastSpinReward = reward;
            }
        }
    };

    applyMilestone(10, 100, 'lvl10');
    applyMilestone(20, 0, 'lvl20', 'pet');
    applyMilestone(50, 1000, 'lvl50');
    applyMilestone(100, 0, 'lvl100', 'spin');
};

const claimDailyPetReward = (userId, friendId, linkA, linkB) => {
    if (!linkA.petUnlocked || !linkB.petUnlocked) return null;
    const levelGate = Math.min(linkA.level || 0, linkB.level || 0);
    if (levelGate < 20) return null;

    const pair = [userId, friendId].sort().join(':');
    const dayKey = new Date().toISOString().slice(0, 10);
    const key = `${pair}_${dayKey}`;
    if (!db.friendPetDaily[key]) {
        db.friendPetDaily[key] = { amount: Math.floor(5 + Math.random() * 16), claimed: {} };
    }
    const entry = db.friendPetDaily[key];
    if (entry.claimed[userId]) return null;

    const user = db.users.find(u => u.id === userId);
    if (!user) return null;
    user.coins = (user.coins || 0) + entry.amount;
    entry.claimed[userId] = true;

    const bunnyLevel = Math.max(1, Math.floor((Math.min(linkA.xp || 0, linkB.xp || 0)) / 200));
    return { amount: entry.amount, bunnyLevel, dayKey };
};

const getFriendPresence = (friendId) => {
    const now = Date.now();
    for (const gameId in activePlayers) {
        const p = activePlayers[gameId] && activePlayers[gameId][friendId];
        if (p && (now - p.timestamp) < 5000) {
            const g = db.games.find(game => game.id === gameId);
            return { inGame: true, gameId, gameName: g ? g.title : 'Unknown Game' };
        }
    }
    return { inGame: false, gameId: null, gameName: null };
};

const buildHeadshotDataUri = (username, color = '#e74c3c') => {
    const safeName = String(username || '?').slice(0, 2).toUpperCase();
    const safeColor = /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#e74c3c';
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'><rect width='64' height='64' rx='12' fill='#1f2d3a'/><circle cx='32' cy='24' r='13' fill='${safeColor}'/><rect x='16' y='38' width='32' height='18' rx='9' fill='${safeColor}'/><text x='32' y='60' text-anchor='middle' fill='#fff' font-size='10' font-family='Arial'>${safeName}</text></svg>`;
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
};

const awardBadge = (userId, badgeName) => {
    const user = db.users.find(u => u.id === userId);
    if (user && !user.badges.includes(badgeName)) {
        user.badges.push(badgeName);
        return true;
    }
    return false;
};

const addGroupXp = (group, amount) => {
    if (typeof group.xp === 'undefined') group.xp = 0;
    if (typeof group.level === 'undefined') group.level = 1;

    group.xp += amount;
    
    // Progressively harder: Level 2 needs 50 XP, then grows by 1.5x each level
    let requiredXp = Math.floor(50 * Math.pow(1.5, group.level - 1));
    let requiredMembers = group.level === 1 ? 2 : Math.min(group.level + 1, 10); 

    while (group.xp >= requiredXp && group.members.length >= requiredMembers) {
        group.xp -= requiredXp; // Consume XP to level up
        group.level += 1;
        
        // Level Up Rewards
        if (group.level % 10 === 0) {
            group.coins = (group.coins || 0) + 250; // Milestone Reward
        } else {
            group.coins = (group.coins || 0) + 100; // Standard Reward
        }
        
        // Recalculate for next iteration in case of massive XP gain
        requiredXp = Math.floor(50 * Math.pow(1.5, group.level - 1));
        requiredMembers = group.level === 1 ? 2 : Math.min(group.level + 1, 10);
    }
};


// --- Moderator / Mod Panel Helpers ---
const modPanelSessions = {}; // token -> expiresAt
const MOD_PANEL_CODE = '5045';
const MOD_PANEL_DURATION_MS = 10 * 60 * 1000; // 10 minutes

const getUserById = (userId) => db.users.find(u => u.id === userId);

const isAdminAccount = (user) => {
    return !!user && user.username && user.username.toLowerCase() === 'nick';
};

const isModAccount = (user) => {
    return !!user && user.username && user.username.toLowerCase() === 'austin';
};

const canUseModerationPanel = (user) => {
    return isAdminAccount(user) || isModAccount(user);
};

const requireModerator = (req, res, next) => {
    const user = getUserById(req.userId);
    if (!canUseModerationPanel(user)) {
        return res.status(403).json({ error: 'Moderators only.' });
    }
    req.modUser = user;
    next();
};

const requireModPanelUnlocked = (req, res, next) => {
    const token = req.headers.authorization;
    const expiresAt = modPanelSessions[token];

    if (!expiresAt || expiresAt < Date.now()) {
        if (token && modPanelSessions[token]) delete modPanelSessions[token];
        return res.status(403).json({ error: 'Mod panel locked.' });
    }

    next();
};

const PLATFORM_ADMIN_USERNAMES = new Set(['austin', 'nick', 'admin']);
const isPlatformAdminUser = (user) => !!(user && PLATFORM_ADMIN_USERNAMES.has(String(user.username || '').toLowerCase()));
const requirePlatformAdmin = (req, res, next) => {
    const user = db.users.find(u => u.id === req.userId);
    if (!isPlatformAdminUser(user)) return res.status(403).json({ error: 'Platform admins only.' });
    req.platformAdminUser = user;
    next();
};

const applyModerationActionToUser = (target, action = 'none', reason = '', durationHours = 24) => {
    if (!target) return;
    const safeReason = String(reason || '').slice(0, 300) || 'Policy violation.';
    if (action === 'warn') {
        if (!db.moderation.warnings[target.id]) db.moderation.warnings[target.id] = [];
        db.moderation.warnings[target.id].push({
            id: crypto.randomUUID(),
            reason: safeReason,
            date: Date.now(),
            acknowledged: false
        });
    } else if (action === 'tempban') {
        const expires = Date.now() + (Math.max(1, parseInt(durationHours, 10) || 24) * 3600000);
        db.moderation.bans[target.id] = { reason: safeReason, expires };
    } else if (action === 'permaban') {
        db.moderation.bans[target.id] = { reason: safeReason, expires: 'permanent' };
    }
};

const getCreatorLeagueForStats = ({ playerCount = 0, plays = 0, retention = 0 }) => {
    const score = (playerCount * 2) + (plays * 0.5) + (retention * 20);
    if (score >= 500) return 'Mythic';
    if (score >= 320) return 'Diamond';
    if (score >= 190) return 'Gold';
    if (score >= 90) return 'Silver';
    return 'Bronze';
};
const CREATOR_LEAGUE_REWARDS = { Bronze: 40, Silver: 80, Gold: 130, Diamond: 200, Mythic: 300 };
const getCurrentMonthKey = () => {
    const d = new Date();
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};
const computeCreatorLeagueForUser = (userId) => {
    const myGames = (db.games || []).filter(g => g.authorId === userId);
    const playerCount = myGames.reduce((sum, g) => sum + ((g.analytics?.uniquePlayers || []).length || 0), 0);
    const plays = myGames.reduce((sum, g) => sum + (g.plays || 0), 0);
    const totalSession = myGames.reduce((sum, g) => sum + (g.analytics?.totalSessionTimeSeconds || 0), 0);
    const retention = plays > 0 ? Math.min(10, totalSession / Math.max(1, plays * 60)) : 0;
    const tier = getCreatorLeagueForStats({ playerCount, plays, retention });
    return { tier, playerCount, plays, retention, reward: CREATOR_LEAGUE_REWARDS[tier] || 0 };
};

const PROFILE_THEME_CATALOG = [
    { id: 'theme_playsculpt_blue', name: 'Playsculpt Blue', price: 50, colorA: '#dff1ff', colorB: '#8ecbff', shine: false },
    { id: 'theme_playsculpt_purple', name: 'Playsculpt Purple', price: 50, colorA: '#f1e6ff', colorB: '#c8a3ff', shine: false },
    { id: 'theme_yellow', name: 'Yellow Theme', price: 100, colorA: '#fff9d8', colorB: '#ffe16b', shine: false },
    { id: 'theme_orange', name: 'Orange Theme', price: 100, colorA: '#fff0df', colorB: '#ffb668', shine: false },
    { id: 'theme_green', name: 'Green Theme', price: 100, colorA: '#e2ffe8', colorB: '#7edb95', shine: false },
    { id: 'theme_red', name: 'Red Theme', price: 100, colorA: '#ffe3e3', colorB: '#ff8d8d', shine: false },
    { id: 'theme_pink', name: 'Pink Theme', price: 100, colorA: '#ffe7f5', colorB: '#ff9fd5', shine: false },
    { id: 'theme_grey', name: 'Grey Theme', price: 100, colorA: '#eef1f4', colorB: '#b4bcc4', shine: false },
    { id: 'theme_black', name: 'Black Theme', price: 100, colorA: '#2a2d33', colorB: '#4b5563', shine: false },
    { id: 'theme_gold', name: 'Gold Theme', price: 900, colorA: '#fff4bf', colorB: '#f5b642', shine: true }
];
const PROFILE_COSMETIC_CATALOG = [
    { id: 'cosmetic_pinned_game_feature', name: 'Pinned Game Creation Profile Feature', price: 850, description: 'Ability to pin a game you made at the top of your profile and write a short description of it' },
    { id: 'cosmetic_profile_font_chooser', name: 'Custom Profile Text Font Chooser', price: 725, description: 'Unlock dropdown control to set your profile text font to one of 8 fonts.' },
    { id: 'cosmetic_profile_text_color', name: 'Profile Text Color Chooser', price: 600, description: 'Unlock color-wheel control to set your profile text color.' },
    { id: 'cosmetic_profile_worlds', name: 'Profile Worlds', price: 2500, description: 'A addition to your Playsculpt profile that enables other users to join your profile world, see your games and creations, and join them through portals, all in one place!' }
];
const getProfileStoreItem = (itemId) => PROFILE_THEME_CATALOG.concat(PROFILE_COSMETIC_CATALOG).find(i => i.id === itemId);

const REPORT_COIN_REWARDS = [150, 300, 800];
const rollReportCrateReward = () => {
    const roll = Math.random();
    if (roll < 0.2) return REPORT_COIN_REWARDS[2];
    return Math.random() < 0.5 ? REPORT_COIN_REWARDS[0] : REPORT_COIN_REWARDS[1];
};


// --- Routes ---



// --- Mod Panel Security ---
app.post('/api/mod-panel/unlock', requireAuth, requireModerator, (req, res) => {
    const { code } = req.body;

    if (String(code || '').trim() !== MOD_PANEL_CODE) {
        const token = req.headers.authorization;
        delete modPanelSessions[token];
        return res.status(403).json({ error: 'Incorrect security code.' });
    }

    const token = req.headers.authorization;
    const expiresAt = Date.now() + MOD_PANEL_DURATION_MS;
    modPanelSessions[token] = expiresAt;

    res.json({ success: true, expiresAt });
});

app.get('/api/mod-panel/check', requireAuth, requireModerator, (req, res) => {
    const token = req.headers.authorization;
    const expiresAt = modPanelSessions[token] || 0;

    res.json({
        unlocked: expiresAt > Date.now(),
        expiresAt
    });
});

app.post('/api/mod-panel/lock', requireAuth, requireModerator, (req, res) => {
    const token = req.headers.authorization;
    delete modPanelSessions[token];
    res.json({ success: true });
});



app.get('/api/moderate/user/:username', requireAuth, requireModerator, requireModPanelUnlocked, (req, res) => {
    const target = db.users.find(
        u => u.username.toLowerCase() === req.params.username.toLowerCase()
    );

    if (!target) {
        return res.status(404).json({ error: 'User not found.' });
    }

    const warnings = (db.moderation?.warnings?.[target.id] || []).slice().reverse();
    const ban = db.moderation?.bans?.[target.id] || null;

    res.json({
        user: {
            id: target.id,
            username: target.username,
            createdAt: target.createdAt || 0
        },
        warnings,
        ban
    });
});




app.post('/api/signup', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password || username.length < 3 || password.length < 5) {
        return res.status(400).json({ error: 'Invalid username or password length.' });
    }
    if (db.users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
        return res.status(400).json({ error: 'Username already exists.' });
    }

if (typeof db.lastUserIdNum !== 'number') {
        db.lastUserIdNum = db.users.length; // Fallback to current user count
    }
    db.lastUserIdNum++; 
    const userIdNum = db.lastUserIdNum;

    const { salt, hash } = hashPassword(password);
   const newUser = {
        id: crypto.randomUUID(), username, salt, hash,
        createdAt: Date.now(), // ADD THIS LINE!
userIdNum: userIdNum,
        followers: [], friends: [], friendRequests: [],
        color: '#e74c3c', recentlyPlayed: [], badges: [], messages: [],
        reportCrates: [], accurateReports: 0,
        inventory: [], clothingInventory: [], equippedShirt: null, equippedPants: null, challengeClaims: {}, challengeProgress: { dayKey: '', partsPlaced: 0, publishes: 0, cityVisits: 0, gamesPlayed: 0, likesGiven: 0, friendsAdded: 0, messagesSent: 0, groupPosts: 0, purchases: 0 }, academyProgress: {}, academyClaims: {}, jamVotes: {}, blueprintFavorites: [], bookmarks: [], equipped: null, profileItems: [], equippedProfileTheme: null, equippedProfileCosmetic: null, equippedProfileCosmetics: [], profilePinnedGame: { enabled: false, gameId: null, description: '' }, profileWorld: { equipped: false, gameIds: [], assetIds: [], greeting: '' }, profileBio: '', profileTextStyle: { font: 'default', color: '#2c3e50' }, lastSeenAt: Date.now(), primaryGroupId: null, coins: 0, trustPoints: 0, trustLevel: 1, lastTrustDailyAt: 0, lastTrustGainAt: 0, trustHistory: []
    };
    db.users.push(newUser);
    markLastSignup(newUser.username, 'user');


    
    const token = crypto.randomBytes(32).toString('hex');
    db.sessions[token] = newUser.id;
onlineUsers[newUser.id] = { lastSeen: Date.now(), location: 'website' };
    saveDB();
    const trustMeta = normalizeUserTrust(newUser);
    res.json({ token, username: newUser.username, userId: newUser.id, color: newUser.color, equipped: newUser.equipped, coins: newUser.coins, trustPoints: trustMeta.trustPoints, trustLevel: trustMeta.trustLevel, trustLevelName: trustMeta.trustLevelName });
});

// Helper to format ban time
const getBanMessage = (ban) => {
    if (ban.expires === 'permanent') return `Account permanently suspended. Reason: ${ban.reason}`;
    const msLeft = ban.expires - Date.now();
    const hours = Math.floor(msLeft / (1000 * 60 * 60));
    const mins = Math.floor((msLeft % (1000 * 60 * 60)) / (1000 * 60));
    return `Account suspended. Reason: ${ban.reason}. Time remaining: ${hours}h ${mins}m`;
};

app.post('/api/login', (req, res) => {
    const { username, password, pin } = req.body;
    const user = db.users.find(u => u.username.toLowerCase() === username.toLowerCase());
    
    if (!user || !verifyPassword(password, user.salt, user.hash)) {
        return res.status(401).json({ error: 'Invalid username or password.' });
    }

    // --- NEW ADMIN PIN SYSTEM ---
    if (user.username.toLowerCase() === 'admin') {
        if (Date.now() < adminAuth.lockoutUntil) {
            const mins = Math.ceil((adminAuth.lockoutUntil - Date.now()) / 60000);
            return res.status(403).json({ error: `Too many attempts. PIN locked for ${mins} minutes.` });
        }
        if (pin === undefined) {
            return res.json({ requiresPin: true }); // Tell frontend to show PIN UI
        }
        if (pin !== '72891') {
            adminAuth.attempts++;
            if (adminAuth.attempts >= 2) {
                adminAuth.lockoutUntil = Date.now() + 30 * 60 * 1000; // 30 Min Lockout
                adminAuth.attempts = 0;
                return res.status(403).json({ error: 'Too many attempts. PIN locked for 30 minutes.' });
            }
            return res.status(401).json({ error: 'Invalid PIN.' });
        }
        adminAuth.attempts = 0; // Success, reset attempts
    }
    // ----------------------------

    // Enforce Bans
    if (db.moderation && db.moderation.bans[user.id]) {
        const ban = db.moderation.bans[user.id];
        if (ban.expires === 'permanent' || ban.expires > Date.now()) {
            return res.status(403).json({ error: getBanMessage(ban) }); 
        } else {
            delete db.moderation.bans[user.id]; 
            saveDB();
        }
    }

    const token = crypto.randomBytes(32).toString('hex');
    db.sessions[token] = user.id;
    onlineUsers[user.id] = { lastSeen: Date.now(), location: 'website' };
    saveDB();

    let pendingWarnings = [];
    if (db.moderation && db.moderation.warnings && db.moderation.warnings[user.id]) {
        pendingWarnings = db.moderation.warnings[user.id].filter(w => w.acknowledged === false);
    }
    const gainedDailyTrust = maybeAwardTrustDaily(user);
    if (gainedDailyTrust) saveDB();
    const trustMeta = normalizeUserTrust(user);
    res.json({ token, username: user.username, userId: user.id, color: user.color, equipped: user.equipped, coins: user.coins, trustPoints: trustMeta.trustPoints, trustLevel: trustMeta.trustLevel, trustLevelName: trustMeta.trustLevelName, pendingWarnings });
});

app.post('/api/moderate', requireAuth, requireModerator, requireModPanelUnlocked, (req, res) => {
        const { targetUsername, action, reason, durationHours } = req.body;
    
const actingUser = req.modUser;

if (!actingUser) {
    return res.status(403).json({ error: 'Unauthorized. Moderators only.' });
}

    const target = db.users.find(u => u.username.toLowerCase() === targetUsername.toLowerCase());
    if (!target) return res.status(404).json({ error: 'User not found' });

    if (action === 'warn') {
        if (!db.moderation.warnings[target.id]) db.moderation.warnings[target.id] = [];
        db.moderation.warnings[target.id].push({ 
            id: crypto.randomUUID(), // Unique ID so they can acknowledge it
            reason, 
            date: Date.now(),
            acknowledged: false 
        });
    } 
    else if (action === 'tempban') {
        const expires = Date.now() + (durationHours * 3600000);
        db.moderation.bans[target.id] = { reason, expires: expires };
    } 
    else if (action === 'permaban') {
        db.moderation.bans[target.id] = { reason, expires: 'permanent' };
    } 
    else if (action === 'ipban') {
        if (target.lastIp && !db.moderation.ipBans.includes(target.lastIp)) {
            db.moderation.ipBans.push(target.lastIp);
        }
        db.moderation.bans[target.id] = { reason, expires: 'permanent', isIpBan: true };
    }
    // --- NEW UNBAN / UNWARN LOGIC ---
    else if (action === 'unban') {
        if (db.moderation.bans[target.id]) {
            // Also lift IP ban if applicable
            if (db.moderation.bans[target.id].isIpBan && target.lastIp) {
                db.moderation.ipBans = db.moderation.ipBans.filter(ip => ip !== target.lastIp);
            }
            delete db.moderation.bans[target.id];
        }
    }
    else if (action === 'clearwarnings') {
        db.moderation.warnings[target.id] = [];
    }
    // --------------------------------

    saveDB(); 
    res.json({ success: true, message: `Action ${action} applied to ${target.username}` });
});

app.post('/api/admin/games/:id/remove', requireAuth, requirePlatformAdmin, (req, res) => {
    const game = db.games.find(g => g.id === req.params.id);
    if (!game) return res.status(404).json({ error: 'Game not found.' });
    const owner = db.users.find(u => u.id === game.authorId);
    const { action, reason, durationHours } = req.body || {};
    if (owner) applyModerationActionToUser(owner, String(action || 'none'), reason, durationHours);
    db.games = db.games.filter(g => g.id !== game.id);
    if (activePlayers[game.id]) delete activePlayers[game.id];
    if (activeEditors[game.id]) delete activeEditors[game.id];
    if (deletedObjectTombstones[game.id]) delete deletedObjectTombstones[game.id];
    saveDB();
    res.json({ success: true, removedId: game.id, removedType: 'game' });
});

app.post('/api/admin/groups/:id/remove', requireAuth, requirePlatformAdmin, (req, res) => {
    const group = db.groups.find(gr => gr.id === req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found.' });
    const owner = db.users.find(u => u.id === group.ownerId);
    const { action, reason, durationHours } = req.body || {};
    if (owner) applyModerationActionToUser(owner, String(action || 'none'), reason, durationHours);
    db.games.forEach(g => { if (g.groupId === group.id) g.groupId = null; });
    db.groups = db.groups.filter(gr => gr.id !== group.id);
    saveDB();
    res.json({ success: true, removedId: group.id, removedType: 'group' });
});

app.post('/api/reports', requireAuth, (req, res) => {
    const user = db.users.find(u => u.id === req.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const category = String(req.body.category || '').trim();
    const targetType = String(req.body.targetType || '').trim();
    const targetId = String(req.body.targetId || '').trim();
    const targetName = String(req.body.targetName || 'Unknown').trim().slice(0, 120);
    const description = String(req.body.description || '').trim().slice(0, 2000);
    const evidenceFiles = Array.isArray(req.body.evidenceFiles) ? req.body.evidenceFiles.slice(0, 4) : [];

    if (!category || !targetType || !targetId) {
        return res.status(400).json({ error: 'Missing report target details.' });
    }
    if (description.length < 5) {
        return res.status(400).json({ error: 'Please add a little more detail to your report.' });
    }

    const safeFiles = evidenceFiles.map((f, idx) => ({
        id: crypto.randomUUID(),
        name: String(f.name || `evidence-${idx + 1}`).slice(0, 120),
        type: String(f.type || 'application/octet-stream').slice(0, 80),
        size: Math.max(0, Math.min(Number(f.size) || 0, 8 * 1024 * 1024)),
        dataUrl: String(f.dataUrl || '').slice(0, 2_000_000)
    })).filter(f => /^data:/.test(f.dataUrl));

    const report = {
        id: crypto.randomUUID(),
        reporterId: user.id,
        reporterName: user.username,
        category,
        targetType,
        targetId,
        targetName,
        description,
        evidenceFiles: safeFiles,
        createdAt: Date.now(),
        status: 'pending',
        reviewedAt: null,
        reviewedBy: null
    };
    db.reports.unshift(report);
    saveDB();
    res.json({ success: true, reportId: report.id });
});

app.get('/api/moderate/reports', requireAuth, requireModerator, requireModPanelUnlocked, (req, res) => {
    const pending = (db.reports || []).filter(r => r.status === 'pending');
    res.json(pending);
});

app.post('/api/moderate/reports/:id', requireAuth, requireModerator, requireModPanelUnlocked, (req, res) => {
    const report = (db.reports || []).find(r => r.id === req.params.id && r.status === 'pending');
    if (!report) return res.status(404).json({ error: 'Report not found.' });

    const action = String(req.body.action || '').toLowerCase();
    if (!['approve', 'deny'].includes(action)) return res.status(400).json({ error: 'Invalid action.' });

    report.status = action;
    report.reviewedAt = Date.now();
    report.reviewedBy = req.userId;

    if (action === 'approve') {
        const reporter = db.users.find(u => u.id === report.reporterId);
        if (reporter) {
            if (!Array.isArray(reporter.reportCrates)) reporter.reportCrates = [];
            reporter.reportCrates.push({
                id: crypto.randomUUID(),
                fromReportId: report.id,
                rewardCoins: rollReportCrateReward(),
                createdAt: Date.now(),
                openedAt: null
            });
            reporter.accurateReports = (reporter.accurateReports || 0) + 1;
            applyTrustPoints(reporter, 75, 'SculptShield valid report accepted');
            if ((reporter.accurateReports || 0) === 1) {
                awardBadge(reporter.id, 'Guardian');
            }
        }
        if (report.category === 'live_channel_logo' && report.targetId) {
            const acc = (db.live?.accounts || []).find(a => a.id === report.targetId);
            if (acc && acc.pendingLogo) {
                acc.logo = acc.pendingLogo;
                acc.pendingLogo = '';
                acc.logoStatus = 'approved';
            }
        }
    } else if (action === 'deny') {
        const reporter = db.users.find(u => u.id === report.reporterId);
        if (reporter) applyTrustPoints(reporter, -20, 'SculptShield report rejected');
        if (report.category === 'live_channel_logo' && report.targetId) {
            const acc = (db.live?.accounts || []).find(a => a.id === report.targetId);
            if (acc) {
                acc.pendingLogo = '';
                acc.logoStatus = 'rejected';
            }
        }
    }

    saveDB();
    res.json({ success: true });
});

app.post('/api/me/report-crates/:crateId/open', requireAuth, (req, res) => {
    const user = db.users.find(u => u.id === req.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    if (!Array.isArray(user.reportCrates)) user.reportCrates = [];
    const crate = user.reportCrates.find(c => c.id === req.params.crateId);
    if (!crate) return res.status(404).json({ error: 'Crate not found.' });
    if (crate.openedAt) return res.status(400).json({ error: 'Crate already opened.' });

    crate.openedAt = Date.now();
    const reward = Number(crate.rewardCoins) || 150;
    user.coins = (user.coins || 0) + reward;
    saveDB();
    res.json({ success: true, rewardCoins: reward, coins: user.coins });
});

// User Endpoint: Acknowledge Warning
app.post('/api/me/acknowledge-warning', requireAuth, (req, res) => {
    const { warningId } = req.body;
    const userWarnings = db.moderation.warnings[req.userId];
    if (userWarnings) {
        const targetWarn = userWarnings.find(w => w.id === warningId);
        if (targetWarn) targetWarn.acknowledged = true;
        saveDB();
    }
    res.json({ success: true });
});


app.get('/api/restore', requireAuth, (req, res) => {
    const user = db.users.find(u => u.id === req.userId);
    if(!user) return res.status(404).json({ error: "User not found" });

    if (db.moderation && db.moderation.bans[user.id]) {
        const ban = db.moderation.bans[user.id];
        if (ban.expires === 'permanent' || ban.expires > Date.now()) {
            delete db.sessions[req.headers.authorization]; 
            saveDB();
            return res.status(403).json({ error: getBanMessage(ban) }); // UPDATED
        } else {
            delete db.moderation.bans[user.id];
            saveDB();
        }
    }

    // Fetch unacknowledged warnings
// Safely fetch unacknowledged warnings
let pendingWarnings = [];
if (db.moderation && db.moderation.warnings && db.moderation.warnings[user.id]) {
    pendingWarnings = db.moderation.warnings[user.id].filter(w => w.acknowledged === false);
}

    const gainedDailyTrust = maybeAwardTrustDaily(user);
    if (gainedDailyTrust) saveDB();
    const trustMeta = normalizeUserTrust(user);
    res.json({ token: req.headers.authorization, username: user.username, userId: user.id, color: user.color, equipped: user.equipped, equippedShirt: user.equippedShirt || null, equippedPants: user.equippedPants || null, profileBio: user.profileBio || '', equippedProfileTheme: user.equippedProfileTheme || null, equippedProfileCosmetic: user.equippedProfileCosmetic || null, equippedProfileCosmetics: user.equippedProfileCosmetics || (user.equippedProfileCosmetic ? [user.equippedProfileCosmetic] : []), profileTextStyle: user.profileTextStyle || { font: 'default', color: '#2c3e50' }, profilePinnedGame: user.profilePinnedGame || { enabled: false, gameId: null, description: '' }, coins: user.coins, trustPoints: trustMeta.trustPoints, trustLevel: trustMeta.trustLevel, trustLevelName: trustMeta.trustLevelName, pendingWarnings });
});

app.post('/api/logout', requireAuth, (req, res) => {
    delete onlineUsers[req.userId];
    delete db.sessions[req.headers.authorization];
    saveDB();
    res.json({ message: 'Logged out successfully.' });
});

app.put('/api/me/settings', requireAuth, (req, res) => {
    const { newUsername, newPassword, profileBio } = req.body;
    const user = db.users.find(u => u.id === req.userId);

   if (newUsername && newUsername !== user.username) {
        if (newUsername.length < 3) return res.status(400).json({ error: 'Username too short.' });
        if (db.users.find(u => u.username.toLowerCase() === newUsername.toLowerCase())) {
            return res.status(400).json({ error: 'Username taken.' });
        }
        if (user.coins < 2000) return res.status(400).json({ error: 'You need 2000 SC to change your username.' });
        
        user.coins -= 2000; // Deduct the SC fee
        user.username = newUsername;

        db.games.forEach(g => {
            if (g.authorId === user.id && !g.groupId) g.authorName = newUsername;
        });
        db.shopItems.forEach(i => {
            if (i.authorId === user.id) i.authorName = newUsername;
        });
    }
    if (newPassword) {
        if (newPassword.length < 5) return res.status(400).json({ error: 'Password too short.' });
        const { salt, hash } = hashPassword(newPassword);
        user.salt = salt;
        user.hash = hash;
    }
    if (profileBio !== undefined) {
        user.profileBio = String(profileBio || '').slice(0, 400);
    }

    saveDB();
    res.json({ message: 'Settings updated successfully!', username: user.username, profileBio: user.profileBio || '' });
});

app.delete('/api/admin/users/:username', requireAuth, (req, res) => {
    const actingUser = db.users.find(u => u.id === req.userId);
    if (!isPrimaryAdmin(actingUser)) return res.status(403).json({ error: 'Admin only.' });

    const targetUsername = String(req.params.username || '').trim();
    if (!targetUsername) return res.status(400).json({ error: 'Target username is required.' });

    const target = db.users.find(u => String(u.username || '').toLowerCase() === targetUsername.toLowerCase());
    if (!target) return res.status(404).json({ error: 'User not found.' });
    if (isPrimaryAdmin(target)) return res.status(400).json({ error: 'Cannot delete the Admin account.' });

    deleteUserAccountCompletely(target);
    saveDB();
    res.json({ success: true, deletedUser: target.username });
});

app.post('/api/admin/economy/grant-coins', requireAuth, (req, res) => {
    const actingUser = db.users.find(u => u.id === req.userId);
    if (!canUseEconomyAdmin(actingUser)) return res.status(403).json({ error: 'Economy admin only.' });
    const { username, amount } = req.body || {};
    const target = db.users.find(u => String(u.username || '').toLowerCase() === String(username || '').toLowerCase());
    const amt = parseInt(amount, 10);
    if (!target) return res.status(404).json({ error: 'Target user not found.' });
    if (!Number.isFinite(amt) || amt <= 0) return res.status(400).json({ error: 'Amount must be a positive integer.' });
    if (amt > 1000000) return res.status(400).json({ error: 'Amount too large (max 1,000,000).' });
    target.coins = (target.coins || 0) + amt;
    saveDB();
    res.json({ success: true, username: target.username, added: amt, newBalance: target.coins });
});

app.get('/api/admin/chat-logs', requireAuth, (req, res) => {
    const user = db.users.find(u => u.id === req.userId);
    if (!canViewChatLogs(user)) return res.status(403).json({ error: 'Moderator access only.' });

    const since = Number(req.query.since || 0);
    const limit = Math.max(1, Math.min(800, Number(req.query.limit || 200)));
    const usernameQ = String(req.query.username || '').trim().toLowerCase();
    const channelQ = String(req.query.channel || '').trim().toLowerCase();
    const gameIdQ = String(req.query.gameId || '').trim();
    const groupIdQ = String(req.query.groupId || '').trim();

    const list = (db.chatLogs || []).filter((m) => {
        if (since && (Number(m.timestamp) || 0) <= since) return false;
        if (usernameQ && !String(m.authorName || '').toLowerCase().includes(usernameQ)) return false;
        if (channelQ && String(m.channel || '').toLowerCase() !== channelQ) return false;
        if (gameIdQ && String(m.gameId || '') !== gameIdQ) return false;
        if (groupIdQ && String(m.groupId || '') !== groupIdQ) return false;
        return true;
    });

    const sliced = list.slice(-limit);
    res.json({
        logs: sliced,
        channels: Array.from(new Set((db.chatLogs || []).map(m => String(m.channel || '')).filter(Boolean))).sort(),
        games: Array.from(new Set((db.chatLogs || []).map(m => String(m.gameId || '')).filter(Boolean))).sort(),
        groups: Array.from(new Set((db.chatLogs || []).map(m => String(m.groupId || '')).filter(Boolean))).sort()
    });
});

app.get('/api/system/status', (req, res) => {
    const now = Date.now();
    const active = !!restartState.active && now < (restartState.endsAt || 0);
    if (!active && restartState.active) restartState = { active: false, startedAt: 0, endsAt: 0, message: '' };
    res.json({
        restarting: active,
        endsAt: restartState.endsAt || 0,
        startedAt: restartState.startedAt || 0,
        message: restartState.message || RESTART_POPUP_TEXT
    });
});

app.get('/api/system/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders && res.flushHeaders();
    systemEventClients.add(res);
    res.write(`data: ${JSON.stringify({ type: 'hello', restarting: restartState.active, endsAt: restartState.endsAt || 0, message: restartState.message || RESTART_POPUP_TEXT })}\n\n`);
    req.on('close', () => {
        systemEventClients.delete(res);
    });
});

app.post('/api/system/restart', requireAuth, (req, res) => {
    const user = db.users.find(u => u.id === req.userId);
    if (!canViewChatLogs(user)) return res.status(403).json({ error: 'Moderator access only.' });
    if (restartState.active && Date.now() < restartState.endsAt) {
        return res.status(400).json({ error: 'Restart already in progress.' });
    }
    triggerSafeServerRestart(user?.username || 'system');
    res.json({ success: true, restarting: true, endsAt: restartState.endsAt, message: restartState.message });
});

app.post('/api/system/command', requireAuth, (req, res) => {
    const user = db.users.find(u => u.id === req.userId);
    if (!canViewChatLogs(user)) return res.status(403).json({ error: 'Moderator access only.' });
    const command = String(req.body.command || '').trim().toLowerCase();
    if (command === 'restart-server-safe' || command === 'safe_restart') {
        if (!(restartState.active && Date.now() < restartState.endsAt)) triggerSafeServerRestart(user?.username || 'system');
        return res.json({ success: true, output: `Safe restart initiated by ${user.username}.`, endsAt: restartState.endsAt });
    }
    res.status(400).json({ error: 'Unknown command. Try: restart-server-safe' });
});

app.put('/api/me/primary-group', requireAuth, (req, res) => {
    const { groupId } = req.body;
    const user = db.users.find(u => u.id === req.userId);
    user.primaryGroupId = groupId || null;
    saveDB();
    res.json({ success: true });
});

app.get('/api/messages', requireAuth, (req, res) => {
    const user = db.users.find(u => u.id === req.userId);
    const msgs = [...(user.messages || [])].sort((a,b) => b.timestamp - a.timestamp);
    res.json(msgs);
});

app.post('/api/users/:username/message', requireAuth, (req, res) => {
    const { text } = req.body;
    if (!text || text.trim().length === 0) return res.status(400).json({ error: 'Message cannot be empty.' });

    const targetUser = db.users.find(u => u.username.toLowerCase() === req.params.username.toLowerCase());
    if (!targetUser) return res.status(404).json({ error: 'User not found.' });

    const sender = db.users.find(u => u.id === req.userId);

    if (!sender.friends.find(f => f.id === targetUser.id)) {
        return res.status(403).json({ error: 'You can only message friends.' });
    }

    if (!targetUser.messages) targetUser.messages = [];
    const cleanText = text.trim().substring(0, 500);
    if (isLikelyDuplicateMessage(targetUser.messages || [], sender.id, cleanText, 1500)) {
        return res.json({ message: 'Message already sent.' });
    }
    const msgTs = Date.now();
    targetUser.messages.push({
        id: crypto.randomUUID(), fromId: sender.id, fromUsername: sender.username,
        text: cleanText, timestamp: msgTs
    });
    appendChatLog({
        channel: 'direct_message',
        sourceType: 'direct',
        sourceId: targetUser.id,
        authorId: sender.id,
        authorName: sender.username,
        text: cleanText,
        timestamp: msgTs,
        meta: { toUserId: targetUser.id, toUsername: targetUser.username }
    });
    ensureChallengeProgressDay(sender);
    sender.challengeProgress.messagesSent += 1;

    saveDB();
    createNotification(targetUser.id, "message", {
    from: sender.username,
    text: cleanText
});
    res.json({ message: 'Message sent!' });
});
app.get("/api/notifications", requireAuth, (req, res) => {
    const notifs = db.notifications.filter(n => n.userId === req.userId);
    res.json(notifs);
});
app.post("/api/notifications/clear", requireAuth, (req, res) => {
    db.notifications = db.notifications.filter(n => n.userId !== req.userId);
    saveDB();
    res.json({ success: true });
});

app.get("/api/friends", requireAuth, (req, res) => {
    const user = db.users.find(u => u.id === req.userId);
    if (!user) return res.json([]);

    if (!user.friends || user.friends.length === 0) {
        return res.json([]);
    }

    const friends = user.friends.map(f => {
        const friendId = typeof f === 'string' ? f : f.id;
        const friendUser = db.users.find(u => u.id === friendId);
        if (!friendUser) return null;
        const link = ensureFriendLink(user, friendUser.id);
        const friendLink = ensureFriendLink(friendUser, user.id);
        const presence = getFriendPresence(friendUser.id);
        const petReward = claimDailyPetReward(user.id, friendUser.id, link, friendLink);

        const milestones = [
            { level: 10, title: '+100 Coins (Both)', unlocked: !!link.rewards?.lvl10 },
            { level: 20, title: 'Shared Bunny Pet', unlocked: !!link.rewards?.lvl20 },
            { level: 50, title: '+1,000 Coins (Both)', unlocked: !!link.rewards?.lvl50 },
            { level: 100, title: 'Spin Reward (1,500 or 2,500)', unlocked: !!link.rewards?.lvl100 }
        ];
        const nextMilestone = milestones.find(m => !m.unlocked) || null;

        return {
            id: friendUser.id,
            username: friendUser.username,
            isOnline: isUserOnline(friendUser.id),
            color: friendUser.color || '#e74c3c',
            headshot: buildHeadshotDataUri(friendUser.username, friendUser.color),
            friendshipXp: link.xp || 0,
            friendshipLevel: link.level || Math.floor((link.xp || 0) / 100),
            nextLevelXp: ((Math.floor((link.xp || 0) / 100) + 1) * 100),
            milestones,
            nextMilestone,
            sharedPet: link.petUnlocked ? { type: 'Bunny', bunnyLevel: Math.max(1, Math.floor((link.xp || 0) / 200)) } : null,
            petReward,
            ...presence
        };
    }).filter(Boolean);

    saveDB();
    res.json(friends);
});

app.post('/api/friends/team-create-xp', requireAuth, (req, res) => {
    const { gameId } = req.body || {};
    if (!gameId) return res.status(400).json({ error: 'gameId required.' });
    const game = db.games.find(g => g.id === gameId);
    if (!game) return res.status(404).json({ error: 'Game not found.' });

    let canEdit = game.authorId === req.userId || (game.collaborators || []).includes(req.userId);
    if (game.groupId) {
        const group = db.groups.find(gr => gr.id === game.groupId);
        const perms = getGroupMemberPerms(group, req.userId);
        if (perms && perms.editGames) canEdit = true;
    }
    if (!canEdit) return res.status(403).json({ error: 'Not authorized.' });

    const editorMap = activeEditors[game.id] || {};
    const now = Date.now();
    const me = db.users.find(u => u.id === req.userId);
    if (!me) return res.status(401).json({ error: 'Unauthorized.' });
    const friendIds = new Set((me.friends || []).map(f => (typeof f === 'string' ? f : f.id)));
    let awarded = 0;

    Object.keys(editorMap).forEach((uId) => {
        if (uId === req.userId) return;
        const seen = editorMap[uId];
        if (!seen || (now - (seen.timestamp || 0)) > 12000) return;
        if (!friendIds.has(uId)) return;
        const link = ensureFriendLink(me, uId);
        if (now - (link.lastXpAt || 0) < (7 * 60 * 1000)) return;
        grantFriendshipXp(req.userId, uId, 10);
        awarded++;
    });

    if (awarded > 0) saveDB();
    res.json({ success: true, awarded });
});

app.get('/api/creator-leagues/me', requireAuth, (req, res) => {
    const user = db.users.find(u => u.id === req.userId);
    if (!user) return res.status(401).json({ error: 'Unauthorized.' });
    const monthKey = getCurrentMonthKey();
    const league = computeCreatorLeagueForUser(req.userId);
    const claimed = !!(user.creatorLeagueClaims && user.creatorLeagueClaims[monthKey]);
    res.json({ monthKey, ...league, claimed });
});

app.post('/api/creator-leagues/claim', requireAuth, (req, res) => {
    const user = db.users.find(u => u.id === req.userId);
    if (!user) return res.status(401).json({ error: 'Unauthorized.' });
    const monthKey = getCurrentMonthKey();
    if (!user.creatorLeagueClaims) user.creatorLeagueClaims = {};
    if (user.creatorLeagueClaims[monthKey]) return res.status(400).json({ error: 'Already claimed this month.' });
    const league = computeCreatorLeagueForUser(req.userId);
    const reward = league.reward || 0;
    user.coins = (user.coins || 0) + reward;
    user.creatorLeagueClaims[monthKey] = true;
    saveDB();
    res.json({ success: true, reward, coins: user.coins, tier: league.tier, monthKey });
});


app.get('/api/users/search', (req, res) => {
    const query = (req.query.q || '').toLowerCase();
    if (!query) return res.json([]);
    const results = db.users
        .filter(u => u.username.toLowerCase().includes(query))
        .map(u => ({ username: u.username, isOnline: isUserOnline(u.id) })).slice(0, 20);
    res.json(results);
});

app.get('/api/me', requireAuth, (req, res) => {
    const user = db.users.find(u => u.id === req.userId);
    const gainedDailyTrust = maybeAwardTrustDaily(user);
    
    const requests = user.friendRequests.map(id => {
        const u = db.users.find(usr => usr.id === id);
        return u ? { id: u.id, username: u.username } : null;
    }).filter(Boolean);

    const friendsList = user.friends.map(f => {
        const u = db.users.find(usr => usr.id === f.id);
        return u ? { id: u.id, username: u.username, addedAt: f.addedAt, isOnline: isUserOnline(u.id) } : null;
    }).filter(Boolean);

    const recentGames = user.recentlyPlayed.map(rp => {
        const g = db.games.find(gm => gm.id === rp.gameId);
        return g ? { id: g.id, title: g.title, authorName: g.authorName, genre: g.genre, likes: g.likes.length, plays: g.plays, groupId: g.groupId, timestamp: rp.timestamp } : null;
    }).filter(Boolean);

    const bookmarkedGames = (user.bookmarks || []).map(gameId => {
        const g = db.games.find(gm => gm.id === gameId);
        return g ? { id: g.id, title: g.title, authorName: g.authorName, genre: g.genre, likes: g.likes.length, plays: g.plays, groupId: g.groupId } : null;
    }).filter(Boolean);

    const myGroups = db.groups.filter(gr => gr.members.some(m => m.userId === user.id)).map(gr => {
        const mem = gr.members.find(m=>m.userId === user.id);
        const role = gr.roles.find(r => r.id === mem.roleId);
        return { id: gr.id, name: gr.name, roleName: role ? role.name : 'Member', perms: role ? role.perms : {} };
    });

  if (gainedDailyTrust) saveDB();
  res.json({
        id: user.id, username: user.username, color: user.color, badges: user.badges, coins: user.coins, ...normalizeUserTrust(user),
        requests, friends: friendsList, recentlyPlayed: recentGames, bookmarkedGames, 
        unreadMessages: (user.messages || []).length, equipped: user.equipped, myGroups, clothingInventory: user.clothingInventory || [], equippedShirt: user.equippedShirt || null, equippedPants: user.equippedPants || null, profileBio: user.profileBio || '', profileItems: user.profileItems || [], equippedProfileTheme: user.equippedProfileTheme || null, equippedProfileCosmetic: user.equippedProfileCosmetic || null, equippedProfileCosmetics: user.equippedProfileCosmetics || (user.equippedProfileCosmetic ? [user.equippedProfileCosmetic] : []), profileTextStyle: user.profileTextStyle || { font: 'default', color: '#2c3e50' }, profilePinnedGame: user.profilePinnedGame || { enabled: false, gameId: null, description: '' },
        lastSpinDate: user.lastSpinDate,
        loginStreak: user.loginStreak, playStreak: user.playStreak, lastLoginDate: user.lastLoginDate,
        toolboxInventory: user.toolboxInventory,
        reportCrates: user.reportCrates || [],
        accurateReports: user.accurateReports || 0
    });
});

app.get('/api/platform/meta', (req, res) => {
    const lastSignup = (db.systemState && db.systemState.lastSignup) ? db.systemState.lastSignup : { username: '', at: 0, source: 'system' };
    res.json({ lastSignup });
});

const CREATOR_CHALLENGE_POOL = [
    { id: 'parts_10', text: 'Place 10 parts in Studio', reward: 30, check: (p) => p.partsPlaced >= 10 },
    { id: 'publish_1', text: 'Publish one map update', reward: 70, check: (p) => p.publishes >= 1 },
    { id: 'visit_city', text: 'Visit Sculpt City once', reward: 25, check: (p) => p.cityVisits >= 1 },
    { id: 'play_2', text: 'Play 2 community games', reward: 35, check: (p) => p.gamesPlayed >= 2 },
    { id: 'parts_25', text: 'Place 25 parts in Studio', reward: 60, check: (p) => p.partsPlaced >= 25 },
    { id: 'like_3_games', text: 'Like 3 games', reward: 45, check: (p) => (p.likesGiven || 0) >= 3 },
    { id: 'make_friend_1', text: 'Accept 1 friend request', reward: 55, check: (p) => (p.friendsAdded || 0) >= 1 },
    { id: 'send_2_messages', text: 'Send 2 friend messages', reward: 40, check: (p) => (p.messagesSent || 0) >= 2 },
    { id: 'group_wall_post', text: 'Post once on a group wall', reward: 35, check: (p) => (p.groupPosts || 0) >= 1 },
    { id: 'buy_2_items', text: 'Buy 2 shop items', reward: 50, check: (p) => (p.purchases || 0) >= 2 }
];
const getDayKey = () => new Date().toISOString().slice(0, 10);
const getDailyChallenges = () => {
    const daySeed = parseInt(getDayKey().replace(/-/g, ''), 10);
    const out = [];
    for (let i = 0; i < 3; i++) {
        out.push(CREATOR_CHALLENGE_POOL[(daySeed + i * 3) % CREATOR_CHALLENGE_POOL.length]);
    }
    return out;
};
const ensureChallengeProgressDay = (user) => {
    const dayKey = getDayKey();
    if (!user.challengeProgress || user.challengeProgress.dayKey !== dayKey) {
        user.challengeProgress = { dayKey, partsPlaced: 0, publishes: 0, cityVisits: 0, gamesPlayed: 0, likesGiven: 0, friendsAdded: 0, messagesSent: 0, groupPosts: 0, purchases: 0 };
    }
    if (!user.challengeClaims) user.challengeClaims = {};
    if (typeof user.challengeProgress.likesGiven !== 'number') user.challengeProgress.likesGiven = 0;
    if (typeof user.challengeProgress.friendsAdded !== 'number') user.challengeProgress.friendsAdded = 0;
    if (typeof user.challengeProgress.messagesSent !== 'number') user.challengeProgress.messagesSent = 0;
    if (typeof user.challengeProgress.groupPosts !== 'number') user.challengeProgress.groupPosts = 0;
    if (typeof user.challengeProgress.purchases !== 'number') user.challengeProgress.purchases = 0;
};

app.get('/api/challenges/daily', requireAuth, (req, res) => {
    const user = db.users.find(u => u.id === req.userId);
    ensureChallengeProgressDay(user);
    const day = getDayKey();
    const challenges = getDailyChallenges().map(c => ({
        id: c.id,
        text: c.text,
        reward: c.reward,
        completed: c.check(user.challengeProgress),
        claimed: user.challengeClaims[`${day}:${c.id}`] === true
    }));
    saveDB();
    res.json({ day, challenges });
});

app.post('/api/challenges/progress', requireAuth, (req, res) => {
    const { event, amount } = req.body;
    const user = db.users.find(u => u.id === req.userId);
    ensureChallengeProgressDay(user);
    const amt = Math.max(1, Math.min(1000, parseInt(amount) || 1));
    if (event === 'partsPlaced') user.challengeProgress.partsPlaced += amt;
    if (event === 'publishes') user.challengeProgress.publishes += amt;
    if (event === 'cityVisits') user.challengeProgress.cityVisits += amt;
    if (event === 'gamesPlayed') user.challengeProgress.gamesPlayed += amt;
    if (event === 'likesGiven') user.challengeProgress.likesGiven += amt;
    if (event === 'friendsAdded') user.challengeProgress.friendsAdded += amt;
    if (event === 'messagesSent') user.challengeProgress.messagesSent += amt;
    if (event === 'groupPosts') user.challengeProgress.groupPosts += amt;
    if (event === 'purchases') user.challengeProgress.purchases += amt;
    saveDB();
    res.json({ success: true, progress: user.challengeProgress });
});

app.post('/api/challenges/claim', requireAuth, (req, res) => {
    const { id } = req.body;
    const user = db.users.find(u => u.id === req.userId);
    ensureChallengeProgressDay(user);
    const day = getDayKey();
    const challenge = getDailyChallenges().find(c => c.id === id);
    if (!challenge) return res.status(400).json({ error: 'Challenge not available today.' });
    if (!challenge.check(user.challengeProgress)) return res.status(400).json({ error: 'Challenge requirements not met yet.' });
    const claimKey = `${day}:${challenge.id}`;
    if (user.challengeClaims[claimKey]) return res.status(400).json({ error: 'Already claimed today.' });
    user.challengeClaims[claimKey] = true;
    user.coins = (user.coins || 0) + challenge.reward;
    saveDB();
    res.json({ success: true, reward: challenge.reward, coins: user.coins });
});

const CREATOR_ACADEMY_TRACKS = [
    {
        id: 'lighting_basics',
        title: 'Lighting Basics Masterclass',
        description: 'Build atmosphere by balancing light, fog, and contrast for different moods.',
        howTo: 'Open Studio world settings and test three times of day. Start with sun intensity at 0.9 for daytime, then 0.45 for sunset, then 0.2 for night scenes. Adjust fog distance until distant objects fade softly but remain readable, and set exposure low enough to preserve highlights. Save screenshots after each pass and keep the most readable version.',
        reward: 10
    },
    {
        id: 'polish_pass',
        title: 'Polish Pass Workflow',
        description: 'Learn a repeatable workflow for improving player readability and flow.',
        howTo: 'Run a full map pass in this order: spawn clarity, path readability, interaction feedback, and final cleanup. Add signs or visual landmarks every major turn, verify at least one obvious objective in the first 10 seconds, and remove decorative clutter from jump lines. End by playtesting once on low graphics quality to catch contrast and performance issues.',
        reward: 10
    },
    {
        id: 'city_design',
        title: 'Sculpt City District Design',
        description: 'Create spaces that fit city districts and encourage repeat visits.',
        howTo: 'Pick one district theme and design a loop with a clear entrance, central attraction, and reward exit. Include one social area (hangout), one utility area (shop/job), and one traversal shortcut. Use color coding or props so players instantly understand where to go next. Publish a short dev note explaining the district fantasy.',
        reward: 10
    },
    {
        id: 'collab_ready',
        title: 'Collab Ready Production',
        description: 'Prepare your project so collaborators can join quickly without confusion.',
        howTo: 'Rename key objects with prefixes (ENV_, GAMEPLAY_, UI_), separate decorative and logic-heavy areas, and leave three TODO markers for teammates. Publish an update note describing current priorities and testing steps. Before sharing, verify spawn, checkpoints, and one full gameplay loop all function without manual fixes.',
        reward: 10
    },
    {
        id: 'audio_feedback',
        title: 'Audio Feedback Foundations',
        description: 'Use sound intentionally to improve interactions and game feel.',
        howTo: 'Add at least three feedback sounds: success, failure, and traversal/impact. Keep volume levels balanced so no one sound clips over dialogue or ambience. Match tone to theme (horror, sci-fi, cozy, etc.) and ensure each core interaction has consistent audio feedback. Playtest with headphones and speakers to verify clarity.',
        reward: 10
    },
    {
        id: 'onboarding_flow',
        title: 'First 60 Seconds Onboarding',
        description: 'Teach players quickly with UI, layout, and early objectives.',
        howTo: 'Define what players must know in the first minute, then place hints at spawn, first challenge, and first reward. Keep instruction text short, under one sentence each, and pair it with visual cues like arrows or landmarks. Test with a friend and note where they hesitate; revise those moments before marking this complete.',
        reward: 10
    },
    {
        id: 'performance_budget',
        title: 'Performance Budgeting',
        description: 'Keep your map smooth across desktop and mobile by controlling complexity.',
        howTo: 'Audit dense areas for unnecessary parts, overlap, and transparency overuse. Replace repeated detail clusters with simpler variants and reduce expensive visual stacks in high-traffic zones. Test with graphics quality set to Low and verify playability without stutters. Document one optimization you made and why it helped.',
        reward: 10
    }
];

const getOrCreateCurrentJam = () => {
    const now = Date.now();
    let jam = (db.jams || []).find(j => j.startsAt <= now && j.endsAt > now);
    if (!jam) {
        const duration = 1000 * 60 * 60 * 24 * 7;
        const startsAt = now - (now % duration);
        const themes = ['Sky Islands', 'Neon Factory', 'Dungeon Rush', 'Robot Arena', 'Crystal Caverns'];
        const index = Math.floor(startsAt / duration) % themes.length;
        jam = {
            id: `jam_${startsAt}`,
            title: `Creator Jam: ${themes[index]}`,
            theme: themes[index],
            startsAt,
            endsAt: startsAt + duration,
            submissions: []
        };
        db.jams.push(jam);
    }
    return jam;
};

app.get('/api/academy/tracks', requireAuth, (req, res) => {
    const user = db.users.find(u => u.id === req.userId);
    if (!user.academyProgress) user.academyProgress = {};
    if (!user.academyClaims) user.academyClaims = {};
    const tracks = CREATOR_ACADEMY_TRACKS.map(t => ({
        ...t,
        completed: user.academyProgress[t.id] === true,
        claimed: user.academyClaims[t.id] === true
    }));
    saveDB();
    res.json({ tracks });
});

app.post('/api/academy/complete', requireAuth, (req, res) => {
    const { trackId } = req.body;
    const user = db.users.find(u => u.id === req.userId);
    const track = CREATOR_ACADEMY_TRACKS.find(t => t.id === trackId);
    if (!track) return res.status(404).json({ error: 'Track not found.' });
    if (!user.academyProgress) user.academyProgress = {};
    if (!user.academyClaims) user.academyClaims = {};
    user.academyProgress[track.id] = true;
    if (!user.academyClaims[track.id]) {
        user.academyClaims[track.id] = true;
        user.coins = (user.coins || 0) + track.reward;
    }
    saveDB();
    res.json({ success: true, reward: track.reward, coins: user.coins, claimed: true });
});

app.get('/api/jams/current', requireAuth, (req, res) => {
    const jam = getOrCreateCurrentJam();
    const user = db.users.find(u => u.id === req.userId);
    const submissions = (jam.submissions || [])
        .map(s => ({ ...s, voteCount: (s.votes || []).length }))
        .sort((a, b) => b.voteCount - a.voteCount);
    const userSubmission = submissions.find(s => s.authorId === user.id) || null;
    saveDB();
    res.json({ jam: { ...jam, submissions }, userSubmission });
});

app.post('/api/jams/submit', requireAuth, (req, res) => {
    const { gameId, title, pitch } = req.body;
    const user = db.users.find(u => u.id === req.userId);
    const jam = getOrCreateCurrentJam();
    const game = db.games.find(g => g.id === gameId);
    if (!game) return res.status(404).json({ error: 'Game not found.' });
    if (game.authorId !== user.id) return res.status(403).json({ error: 'You can only submit your own game.' });
    let entry = jam.submissions.find(s => s.authorId === user.id);
    if (!entry) {
        entry = { id: crypto.randomUUID(), authorId: user.id, authorName: user.username, votes: [] };
        jam.submissions.push(entry);
    }
    entry.gameId = game.id;
    entry.title = (title || game.title || 'Untitled Jam Entry').slice(0, 80);
    entry.pitch = (pitch || '').slice(0, 300);
    entry.submittedAt = Date.now();
    saveDB();
    res.json({ success: true, entry });
});

app.post('/api/jams/vote', requireAuth, (req, res) => {
    const { submissionId } = req.body;
    const user = db.users.find(u => u.id === req.userId);
    const jam = getOrCreateCurrentJam();
    const submission = jam.submissions.find(s => s.id === submissionId);
    if (!submission) return res.status(404).json({ error: 'Submission not found.' });
    if (submission.authorId === user.id) return res.status(400).json({ error: 'You cannot vote for your own entry.' });
    if (!submission.votes) submission.votes = [];
    if (submission.votes.includes(user.id)) return res.status(400).json({ error: 'Already voted for this entry.' });
    submission.votes.push(user.id);
    saveDB();
    res.json({ success: true, votes: submission.votes.length });
});

app.get('/api/blueprints/feed', requireAuth, (req, res) => {
    const user = db.users.find(u => u.id === req.userId);
    if (!user.blueprintFavorites) user.blueprintFavorites = [];
    const feed = (db.blueprints || [])
        .map(bp => ({
            ...bp,
            favorites: (bp.favorites || []).length,
            favorited: user.blueprintFavorites.includes(bp.id)
        }))
        .sort((a, b) => (b.favorites - a.favorites) || (b.createdAt - a.createdAt));
    saveDB();
    res.json({ blueprints: feed });
});

app.post('/api/blueprints', requireAuth, (req, res) => {
    const { title, summary, tags } = req.body;
    const user = db.users.find(u => u.id === req.userId);
    const bp = {
        id: crypto.randomUUID(),
        title: (title || 'Untitled Blueprint').slice(0, 80),
        summary: (summary || '').slice(0, 300),
        tags: Array.isArray(tags) ? tags.slice(0, 6).map(t => String(t).slice(0, 20)) : [],
        authorId: user.id,
        authorName: user.username,
        createdAt: Date.now(),
        favorites: []
    };
    db.blueprints.push(bp);
    saveDB();
    res.json({ success: true, blueprint: bp });
});

app.post('/api/blueprints/:id/favorite', requireAuth, (req, res) => {
    const user = db.users.find(u => u.id === req.userId);
    const bp = (db.blueprints || []).find(b => b.id === req.params.id);
    if (!bp) return res.status(404).json({ error: 'Blueprint not found.' });
    if (!bp.favorites) bp.favorites = [];
    if (!user.blueprintFavorites) user.blueprintFavorites = [];
    const has = bp.favorites.includes(user.id);
    if (has) {
        bp.favorites = bp.favorites.filter(id => id !== user.id);
        user.blueprintFavorites = user.blueprintFavorites.filter(id => id !== bp.id);
    } else {
        bp.favorites.push(user.id);
        user.blueprintFavorites.push(bp.id);
    }
    saveDB();
    res.json({ success: true, favorited: !has, favorites: bp.favorites.length });
});

// ==========================================
// TOOLBOX SYSTEM
// ==========================================
app.get('/api/toolbox', (req, res) => {
    let items = db.toolboxItems || [];
    
    // NEW: Search functionality
    if (req.query.q) {
        const q = req.query.q.toLowerCase();
        items = items.filter(i => i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q));
    }
    
    res.json(items.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

app.get('/api/toolbox/sponsored', (req, res) => {
    // Only show active sponsorships that haven't expired
    let items = (db.toolboxItems || []).filter(i => i.sponsorBid && i.sponsorBid > 0 && i.sponsorExpiresAt > Date.now());
    items.sort((a,b) => b.sponsorBid - a.sponsorBid);
    res.json(items.slice(0, 5)); 
});
// NEW: Bid to Sponsor an Item
app.post('/api/toolbox/sponsor/:id', requireAuth, (req, res) => {
    const item = db.toolboxItems.find(i => i.id === req.params.id);
    const user = db.users.find(u => u.id === req.userId);
    
    if (!item) return res.status(404).json({ error: 'Item not found.' });
    if (item.authorId !== user.id) return res.status(403).json({ error: 'You can only sponsor your own models.' });
    
    const bid = parseInt(req.body.bid);
    const days = parseInt(req.body.days); // NEW: Get duration
    
    if (isNaN(bid) || bid <= 0) return res.status(400).json({ error: 'Invalid bid amount.' });
    if (isNaN(days) || days < 1 || days > 7) return res.status(400).json({ error: 'Sponsorship duration must be 1 to 7 days.' });
    if (user.coins < bid) return res.status(400).json({ error: 'Insufficient Coins.' });
    
    user.coins -= bid;
    item.sponsorBid = (item.sponsorBid || 0) + bid;
    // Set expiration date!
    item.sponsorExpiresAt = Date.now() + (days * 24 * 60 * 60 * 1000); 
    saveDB();
    
    res.json({ message: `Sponsorship active for ${days} days!`, newBid: item.sponsorBid });
});
app.post('/api/toolbox', requireAuth, (req, res) => {
    const { name, description, price, parts, thumbnail } = req.body; // ADD thumbnail HERE
    if (!name || !parts || parts.length === 0) return res.status(400).json({ error: 'Missing data.' });

    const user = db.users.find(u => u.id === req.userId);
    const newItem = {
        id: crypto.randomUUID(), name, description: description || '', price: parseInt(price) || 0,
        authorId: user.id, authorName: user.username, parts, 
        thumbnail: thumbnail || null, // SAVE IT!
        likes: [], dislikes: [], createdAt: new Date().toISOString()
    };
    
    if (!db.toolboxItems) db.toolboxItems = [];
    db.toolboxItems.push(newItem);
    if (!user.toolboxInventory) user.toolboxInventory = [];
    user.toolboxInventory.push(newItem.id); 
    saveDB();
    
    res.json({ message: 'Model published to Toolbox!', item: newItem });
});
app.post('/api/toolbox/buy/:id', requireAuth, (req, res) => {
    const item = db.toolboxItems.find(i => i.id === req.params.id);
    const user = db.users.find(u => u.id === req.userId);
    
    if (!item) return res.status(404).json({ error: 'Item not found.' });
    if (!user.toolboxInventory) user.toolboxInventory = [];
    if (user.toolboxInventory.includes(item.id)) return res.status(400).json({ error: 'You already own this model.' });
    if (user.coins < item.price) return res.status(400).json({ error: 'Insufficient Coins.' });
    
    user.coins -= item.price;
    user.toolboxInventory.push(item.id);

    // NEW: 100% Revenue Share to Creator!
    const creator = db.users.find(u => u.id === item.authorId);
    if (creator) {
        creator.coins = (creator.coins || 0) + item.price;
    }

    saveDB();
    res.json({ message: 'Model purchased!', coins: user.coins });
});

app.post('/api/toolbox/rate/:id', requireAuth, (req, res) => {
    // ... (Keep your existing rate POST route here) ...
    const item = db.toolboxItems.find(i => i.id === req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found.' });
    const { action } = req.body; 
    if (!item.likes) item.likes = [];
    if (!item.dislikes) item.dislikes = [];
    item.likes = item.likes.filter(id => id !== req.userId);
    item.dislikes = item.dislikes.filter(id => id !== req.userId);
    if (action === 'like') item.likes.push(req.userId);
    else if (action === 'dislike') item.dislikes.push(req.userId);
    saveDB();
    res.json({ success: true, likes: item.likes.length, dislikes: item.dislikes.length });
});

app.get('/api/toolbox/profile/:userId', (req, res) => {
    const u = db.users.find(x => x.id === req.params.userId || x.username === req.params.userId);
    if(!u) return res.status(404).json({error: 'User not found'});
    
    // Grab all models made by this user
    const models = (db.toolboxItems || []).filter(i => i.authorId === u.id);
    
    res.json({
        id: u.id, username: u.username, 
        tbBio: u.tbBio || 'This creator hasn\'t set a bio yet.', 
        tbTheme: u.tbTheme || '#2c3e50', // Default theme
        models: models.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))
    });
});

// NEW: Update Toolbox Profile (Bio & Theme)
app.post('/api/toolbox/profile', requireAuth, (req, res) => {
    const { bio, theme } = req.body;
    const u = db.users.find(x => x.id === req.userId);
    
    if (bio !== undefined) u.tbBio = bio.substring(0, 300); // Max 300 chars
    
    if (theme !== undefined && theme !== u.tbTheme) {
        if (u.coins < 5) return res.status(400).json({error: 'You need 5 Sculpt Coins to change your profile theme color.'});
        u.coins -= 5; // Deduct the 5 SC fee
        u.tbTheme = theme;
    }
    
    saveDB();
    res.json({ success: true, coins: u.coins, tbBio: u.tbBio, tbTheme: u.tbTheme });
});

app.put('/api/me/color', requireAuth, (req, res) => {
    const user = db.users.find(u => u.id === req.userId);
    user.color = req.body.color || '#e74c3c';
    saveDB();
    res.json({ success: true, color: user.color });
});

app.post('/api/me/equip', requireAuth, (req, res) => {
    const { itemId } = req.body;
    const user = db.users.find(u => u.id === req.userId);
    if (itemId && !user.inventory.includes(itemId)) return res.status(403).json({error: 'Not owned'});
    user.equipped = itemId || null;
    saveDB();
    res.json({ message: 'Equipped successfully', equipped: user.equipped });
});

app.get('/api/users/:username', (req, res) => {
    const targetUsername = req.params.username;
    const user = db.users.find(u => u.username.toLowerCase() === targetUsername.toLowerCase());
    if (!user) return res.status(404).json({ error: 'User not found.' });

    let reqUserId = null;
    const token = req.headers.authorization;
    if (token && db.sessions[token]) reqUserId = db.sessions[token];

    let isFollowing = reqUserId ? user.followers.includes(reqUserId) : false;
    let friendStatus = 'none'; 
    if (reqUserId) {
        if (user.friends.find(f => f.id === reqUserId)) friendStatus = 'friends';
        else if (user.friendRequests.includes(reqUserId)) friendStatus = 'pending_sent';
        else {
            const reqUser = db.users.find(u => u.id === reqUserId);
            if (reqUser && reqUser.friendRequests.includes(user.id)) friendStatus = 'pending_received';
        }
    }

    const friendsDetails = user.friends.map(f => {
        const fUser = db.users.find(u => u.id === f.id);
        return fUser ? { username: fUser.username, isOnline: isUserOnline(fUser.id) } : null;
    }).filter(Boolean);

    const userGames = db.games.filter(g => g.authorId === user.id && !g.groupId); 
    const likedGames = db.games.filter(g => g.likes.includes(user.id));
    
    const inventoryItems = user.inventory.map(itemId => {
        return db.shopItems.find(i => i.id === itemId);
    }).filter(Boolean);
    const pinnedGame = user.profilePinnedGame && user.profilePinnedGame.gameId ? db.games.find(g => g.id === user.profilePinnedGame.gameId && g.authorId === user.id) : null;

    // Get groups
    const userGroups = db.groups.filter(gr => gr.members.some(m => m.userId === user.id)).map(gr => {
        const mem = gr.members.find(m=>m.userId === user.id);
        const role = gr.roles.find(r => r.id === mem.roleId);
        return { id: gr.id, name: gr.name, roleName: role ? role.name : 'Member', isPrimary: user.primaryGroupId === gr.id };
    });

    let primaryGroup = userGroups.find(g => g.isPrimary) || null;

    res.json({
        id: user.id, username: user.username, isOnline: isUserOnline(user.id), color: user.color, badges: user.badges,
        followersCount: user.followers.length, isFollowing, friendStatus, friends: friendsDetails, userIdNum: user.userIdNum,
        playStreak: user.playStreak || 0,
        ...normalizeUserTrust(user),
        gamesCreated: userGames.length,
        games: userGames.map(g => ({ id: g.id, title: g.title, authorName: g.authorName, genre: g.genre, likes: g.likes.length, plays: g.plays, groupId: g.groupId })),
        likedGames: likedGames.map(g => ({ id: g.id, title: g.title, authorName: g.authorName, genre: g.genre, likes: g.likes.length, plays: g.plays, groupId: g.groupId })),
        inventory: inventoryItems,
        profileBio: user.profileBio || '',
        createdAt: user.createdAt || Date.now(),
        friendsCount: (user.friends || []).length,
        lastSeenAt: getUserLastSeenAt(user.id),
        equippedProfileTheme: user.equippedProfileTheme || null,
        equippedProfileCosmetic: user.equippedProfileCosmetic || null,
        equippedProfileCosmetics: user.equippedProfileCosmetics || (user.equippedProfileCosmetic ? [user.equippedProfileCosmetic] : []),
        profileTextStyle: user.profileTextStyle || { font: 'default', color: '#2c3e50' },
        profilePinnedGame: user.profilePinnedGame || { enabled: false, gameId: null, description: '' },
        profileWorld: user.profileWorld || { equipped: false, gameIds: [], assetIds: [], greeting: '' },
        pinnedGameData: pinnedGame ? { id: pinnedGame.id, title: pinnedGame.title } : null,
        equipped: user.equipped,
        groups: userGroups, primaryGroup
    });
});

app.post('/api/users/:username/friend-request', requireAuth, (req, res) => {
    const targetUser = db.users.find(u => u.username.toLowerCase() === req.params.username.toLowerCase());
    if (!targetUser || targetUser.id === req.userId) return res.status(400).json({ error: 'Invalid user.' });

    if (!targetUser.friends.find(f => f.id === req.userId) && !targetUser.friendRequests.includes(req.userId)) {
        targetUser.friendRequests.push(req.userId);
        const sender = db.users.find(u => u.id === req.userId);
        createNotification(targetUser.id, "friend_request", {
    from: sender ? sender.username : req.userId
});
        saveDB();
    }
    res.json({ message: 'Friend request sent.' });
});

app.post('/api/users/:username/accept-friend', requireAuth, (req, res) => {
    const reqUser = db.users.find(u => u.id === req.userId);
    const targetUser = db.users.find(u => u.username.toLowerCase() === req.params.username.toLowerCase());
    if (!targetUser) return res.status(404).json({ error: 'User not found.' });
    
    if (reqUser.friendRequests.includes(targetUser.id)) {
        reqUser.friendRequests = reqUser.friendRequests.filter(id => id !== targetUser.id);
        if(!reqUser.friends.find(f => f.id === targetUser.id)) reqUser.friends.push({ id: targetUser.id, addedAt: Date.now() });
        if(!targetUser.friends.find(f => f.id === reqUser.id)) targetUser.friends.push({ id: reqUser.id, addedAt: Date.now() });
        ensureChallengeProgressDay(reqUser);
        reqUser.challengeProgress.friendsAdded += 1;
        saveDB();
    }
    res.json({ message: 'Friend request accepted.' });
});

app.post('/api/users/:username/reject-friend', requireAuth, (req, res) => {
    const reqUser = db.users.find(u => u.id === req.userId);
    const targetUser = db.users.find(u => u.username.toLowerCase() === req.params.username.toLowerCase());
    if (targetUser) {
        reqUser.friendRequests = reqUser.friendRequests.filter(id => id !== targetUser.id);
        saveDB();
    }
    res.json({ message: 'Friend request removed.' });
});

app.post('/api/users/:username/remove-friend', requireAuth, (req, res) => {
    const reqUser = db.users.find(u => u.id === req.userId);
    const targetUser = db.users.find(u => u.username.toLowerCase() === req.params.username.toLowerCase());
    if (targetUser) {
        reqUser.friends = reqUser.friends.filter(f => f.id !== targetUser.id);
        targetUser.friends = targetUser.friends.filter(f => f.id !== reqUser.id);
        saveDB();
    }
    res.json({ message: 'Friend removed.' });
});

app.post('/api/users/:username/follow', requireAuth, (req, res) => {
    const targetUser = db.users.find(u => u.username.toLowerCase() === req.params.username.toLowerCase());
    if (!targetUser) return res.status(404).json({ error: 'User not found.' });
    if (targetUser.id === req.userId) return res.status(400).json({ error: 'Cannot follow yourself.' });

    if (!targetUser.followers.includes(req.userId)) {
        targetUser.followers.push(req.userId);
        saveDB();
    }
    res.json({ message: 'Followed successfully', followersCount: targetUser.followers.length });
});

app.post('/api/users/:username/unfollow', requireAuth, (req, res) => {
    const targetUser = db.users.find(u => u.username.toLowerCase() === req.params.username.toLowerCase());
    if (!targetUser) return res.status(404).json({ error: 'User not found.' });
    targetUser.followers = targetUser.followers.filter(id => id !== req.userId);
    saveDB();
    res.json({ message: 'Unfollowed successfully', followersCount: targetUser.followers.length });
});

// --- Advanced Groups Routes ---
const getGroupMemberPerms = (group, userId) => {
    const mem = group.members.find(m => m.userId === userId);
    if (!mem) return null;
    const role = group.roles.find(r => r.id === mem.roleId);
    return role ? role.perms : null;
};
const getGroupMemberRank = (group, userId) => {
    const mem = group.members.find(m => m.userId === userId);
    if (!mem) return -1;
    const role = group.roles.find(r => r.id === mem.roleId);
    return role ? role.rank : 0;
};

app.get('/api/groups/discover', (req, res) => {
    // Calculate the "Activity Score" for every group
    const groupsWithStats = db.groups.map(gr => {
        let activityScore = 0;
        activityScore += (gr.posts || []).length * 2; // Wall posts
        activityScore += (gr.threads || []).length * 5; // Forum threads
        (gr.threads || []).forEach(t => activityScore += (t.replies || []).length * 3); // Forum replies
        (gr.polls || []).forEach(p => p.options.forEach(o => activityScore += (o.votes || []).length * 4)); // Votes
        
        // Game plays on group games
        const groupGames = db.games.filter(g => g.groupId === gr.id);
        groupGames.forEach(g => activityScore += (g.plays || 0));

        return {
            id: gr.id, name: gr.name, description: gr.description, 
            members: gr.members.length, level: gr.level || 1, logo: gr.logo || '',
            createdAt: gr.createdAt || 0, activityScore
        };
    });

    const recent = [...groupsWithStats].sort((a,b) => b.createdAt - a.createdAt).slice(0, 8);
    const mostMembers = [...groupsWithStats].sort((a,b) => b.members - a.members).slice(0, 8);
    const mostActive = [...groupsWithStats].sort((a,b) => b.activityScore - a.activityScore).slice(0, 8);

    res.json({ recent, mostMembers, mostActive });
});

app.get('/api/groups/search', (req, res) => {
    const query = (req.query.q || '').toLowerCase();
    const results = db.groups
        .filter(gr => gr.name.toLowerCase().includes(query) || gr.description.toLowerCase().includes(query))
        .map(gr => ({ id: gr.id, name: gr.name, description: gr.description, members: gr.members.length, level: gr.level || 1, logo: gr.logo || '' }))
        .slice(0, 20);
    res.json(results);
});

app.post('/api/groups', requireAuth, (req, res) => {
    const { name, description, logo } = req.body;
    const creator = db.users.find(u => u.id === req.userId);
    if (!creator) return res.status(401).json({ error: 'Unauthorized.' });
    if (!name || name.trim().length < 3) return res.status(400).json({ error: 'Group name too short.' });
    if (db.groups.find(gr => gr.name.toLowerCase() === name.toLowerCase())) {
        return res.status(400).json({ error: 'Group name already taken.' });
    }
    const GROUP_CREATE_COST = 100;
    if ((creator.coins || 0) < GROUP_CREATE_COST) return res.status(400).json({ error: `You need ${GROUP_CREATE_COST} SC to create a group.` });
    creator.coins -= GROUP_CREATE_COST;

    const rOwnerId = crypto.randomUUID();
    const rMemberId = crypto.randomUUID();
    
    // Define the extensive list of permissions
    const ownerPerms = { manageRanks: true, kickMembers: true, banMembers: true, editGames: true, deletePosts: true, manageCategories: true, manageEvents: true, managePayouts: true, manageShout: true, manageRelations: true, managePolls: true };
    const memberPerms = { manageRanks: false, kickMembers: false, banMembers: false, editGames: false, deletePosts: false, manageCategories: false, manageEvents: false, managePayouts: false, manageShout: false, manageRelations: false, managePolls: false };

    const newGroup = {
        id: crypto.randomUUID(), name: name.trim(), description: description || '',
        logo: typeof logo === 'string' ? logo.slice(0, 2000000) : '',
        ownerId: req.userId, shout: null,
        roles: [
            { id: rOwnerId, name: 'Owner', rank: 255, perms: ownerPerms },
            { id: rMemberId, name: 'Member', rank: 1, perms: memberPerms }
        ],
        members: [{ userId: req.userId, roleId: rOwnerId, joinedAt: Date.now() }],
        posts: [], categories: [], threads: [], banned: [], events: [], polls: [],
        affiliates: [], affiliateRequests: [], enemies: [], allowEnemies: false,
        coins: 0, level: 1, xp: 0, createdAt: Date.now()
    };
    db.groups.push(newGroup);
    saveDB();
    res.json({ message: 'Group created!', groupId: newGroup.id, coins: creator.coins, cost: GROUP_CREATE_COST });
});

app.put('/api/groups/:id/logo', requireAuth, (req, res) => {
    const group = db.groups.find(gr => gr.id === req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found.' });
    const perms = getGroupMemberPerms(group, req.userId);
    if (!perms || !perms.manageRanks) return res.status(403).json({ error: 'Permission denied.' });
    const logo = typeof req.body.logo === 'string' ? req.body.logo.slice(0, 2000000) : '';
    group.logo = logo;
    saveDB();
    res.json({ success: true, logo: group.logo });
});

app.put('/api/groups/:id/description', requireAuth, (req, res) => {
    const group = db.groups.find(gr => gr.id === req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found.' });
    if (group.ownerId !== req.userId) return res.status(403).json({ error: 'Only the group owner can edit description.' });
    const description = String((req.body || {}).description || '').slice(0, 800).trim();
    group.description = description;
    saveDB();
    res.json({ success: true, description: group.description });
});

app.post('/api/groups/:id/change-owner', requireAuth, (req, res) => {
    const group = db.groups.find(gr => gr.id === req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found.' });
    if (group.ownerId !== req.userId) return res.status(403).json({ error: 'Only the current owner can transfer ownership.' });

    const username = String((req.body || {}).username || '').trim().toLowerCase();
    if (!username) return res.status(400).json({ error: 'Username required.' });
    const target = db.users.find(u => u.username.toLowerCase() === username);
    if (!target) return res.status(404).json({ error: 'User not found.' });
    const targetMember = (group.members || []).find(m => m.userId === target.id);
    if (!targetMember) return res.status(400).json({ error: 'That user must already be a member of the group.' });
    if (target.id === req.userId) return res.status(400).json({ error: 'You already own this group.' });

    const ownerRole = (group.roles || []).find(r => r.rank === 255) || (group.roles || []).find(r => r.name === 'Owner');
    const fallbackRole = (group.roles || []).filter(r => r.rank < 255).sort((a, b) => b.rank - a.rank)[0] || (group.roles || [])[0];

    const oldOwnerMember = (group.members || []).find(m => m.userId === req.userId);
    if (ownerRole && targetMember) targetMember.roleId = ownerRole.id;
    if (oldOwnerMember && fallbackRole) oldOwnerMember.roleId = fallbackRole.id;
    group.ownerId = target.id;
    saveDB();
    res.json({ success: true, newOwner: target.username });
});


// Post Group Shout
app.post('/api/groups/:id/shout', requireAuth, (req, res) => {
    const group = db.groups.find(gr => gr.id === req.params.id);
    const perms = getGroupMemberPerms(group, req.userId);
    if (!perms || !perms.manageShout) return res.status(403).json({ error: 'Permission denied.' });

    const { text } = req.body;
    if (!text) {
        group.shout = null; // Clear shout
    } else {
        const user = db.users.find(u => u.id === req.userId);
        group.shout = { text: text.substring(0, 300), authorName: user.username, timestamp: Date.now() };
    }
    saveDB();
    res.json({ success: true, shout: group.shout });
});

// Ban User
app.post('/api/groups/:id/ban/:username', requireAuth, (req, res) => {
    const group = db.groups.find(gr => gr.id === req.params.id);
    const perms = getGroupMemberPerms(group, req.userId);
    const myRank = getGroupMemberRank(group, req.userId);
    if (!perms || !perms.banMembers) return res.status(403).json({ error: 'Permission denied.' });

    const targetUser = db.users.find(u => u.username.toLowerCase() === req.params.username.toLowerCase());
    if (!targetUser) return res.status(404).json({ error: 'User not found.' });
    if (targetUser.id === group.ownerId) return res.status(403).json({ error: 'Cannot ban the owner.' });

    const targetRank = getGroupMemberRank(group, targetUser.id);
    if (targetRank >= myRank && req.userId !== group.ownerId) return res.status(403).json({ error: 'Cannot ban equal or higher ranks.' });

    if (!group.banned) group.banned = [];
    if (!group.banned.includes(targetUser.id)) group.banned.push(targetUser.id);
    
    // Also kick them immediately
    group.members = group.members.filter(m => m.userId !== targetUser.id);
    saveDB();
    res.json({ success: true });
});

// Unban User
app.post('/api/groups/:id/unban/:username', requireAuth, (req, res) => {
    const group = db.groups.find(gr => gr.id === req.params.id);
    const perms = getGroupMemberPerms(group, req.userId);
    if (!perms || !perms.banMembers) return res.status(403).json({ error: 'Permission denied.' });

    const targetUser = db.users.find(u => u.username.toLowerCase() === req.params.username.toLowerCase());
    if (!targetUser) return res.status(404).json({ error: 'User not found.' });

    if (group.banned) {
        group.banned = group.banned.filter(id => id !== targetUser.id);
        saveDB();
    }
    res.json({ success: true });
});

// Create/Edit Role (Updated to accept full permissions object)
app.post('/api/groups/:id/roles', requireAuth, (req, res) => {
    const group = db.groups.find(gr => gr.id === req.params.id);
    const perms = getGroupMemberPerms(group, req.userId);
    if (!perms || !perms.manageRanks) return res.status(403).json({ error: 'Permission denied.' });

    const { roleId, name, rank, permissions } = req.body;
    if (rank >= 255) return res.status(400).json({ error: 'Cannot create/edit a role equal to or higher than Owner.' });
    
    if (roleId) {
        // Edit existing
        const role = group.roles.find(r => r.id === roleId);
        if (!role || role.rank >= 255) return res.status(400).json({ error: 'Invalid role.' });
        role.name = name; role.rank = parseInt(rank); role.perms = permissions;
    } else {
        // Create new
        const role = { id: crypto.randomUUID(), name, rank: parseInt(rank) || 10, perms: permissions || {} };
        group.roles.push(role);
    }
    
    group.roles.sort((a,b) => b.rank - a.rank);
    saveDB();
    res.json({ success: true, roles: group.roles });
});


app.get('/api/groups/:id', (req, res) => {
    const group = db.groups.find(gr => gr.id === req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found.' });

    // BAN CHECK: If the user requesting this is banned, instantly block them.
    let reqUserId = null;
    if (req.headers.authorization && db.sessions[req.headers.authorization]) {
        reqUserId = db.sessions[req.headers.authorization];
    }
    if (reqUserId && group.banned && group.banned.includes(reqUserId)) {
        return res.status(403).json({ error: 'You are banned from this group.', isBanned: true });
    }

    const memberDetails = group.members.map(m => {
        const u = db.users.find(usr => usr.id === m.userId);
        const role = group.roles.find(r => r.id === m.roleId);
        return u ? { userId: u.id, username: u.username, roleName: role ? role.name : 'Unknown', rank: role ? role.rank : 0, isOnline: isUserOnline(u.id) } : null;
    }).filter(Boolean).sort((a,b) => b.rank - a.rank);

    const groupGames = db.games.filter(g => g.groupId === group.id).map(g => ({
        id: g.id, title: g.title, authorName: g.authorName, genre: g.genre, likes: g.likes.length, plays: g.plays, groupId: g.groupId
    }));

    let myPerms = null, myRank = -1;
    if (reqUserId) {
        myPerms = getGroupMemberPerms(group, reqUserId);
        myRank = getGroupMemberRank(group, reqUserId);
    }

    // Map relations to names for the UI
    const mapGroupBasic = (gId) => {
        const g = db.groups.find(x => x.id === gId);
        return g ? { id: g.id, name: g.name } : null;
    };

    // Calculate Stats Dashboard Math
    const totalPlays = groupGames.reduce((sum, g) => sum + (g.plays || 0), 0);
    const activeMembers = memberDetails.filter(m => m.isOnline).length;
    
    // Calculate progressive next level requirements
    const reqXp = Math.floor(50 * Math.pow(1.5, (group.level || 1) - 1));
    const reqMembers = (group.level || 1) === 1 ? 2 : Math.min((group.level || 1) + 1, 10);

    // Populate Banned Users list for admins
    let bannedUsersList = [];
    if (myPerms && myPerms.banMembers) {
        bannedUsersList = (group.banned || []).map(bId => {
            const u = db.users.find(x => x.id === bId);
            return u ? { id: u.id, username: u.username } : null;
        }).filter(Boolean);
    }

res.json({
    id: group.id,
    name: group.name,
    ownerId: group.ownerId,
    description: group.description,
    logo: group.logo || '',
    groupCoins: group.coins || 0,
    level: group.level,
    xp: group.xp,
    posts: group.posts.slice(0, 50),
    members: memberDetails,
    games: groupGames,
    events: group.events || [],
    roles: group.roles,
    categories: group.categories,
    myPerms,
    myRank,
    affiliates: (group.affiliates || []).map(mapGroupBasic).filter(Boolean),
    enemies: (group.enemies || []).map(mapGroupBasic).filter(Boolean),
    affiliateRequests: (group.affiliateRequests || []).map(mapGroupBasic).filter(Boolean),
    allowEnemies: group.allowEnemies || false,
    stats: { totalGames: groupGames.length, totalPlays, activeMembers },
    polls: group.polls || [],
    nextLevelReqs: { xp: reqXp, members: reqMembers },
    shout: group.shout || null,
    bannedUsers: bannedUsersList
});
});


// Create a new Group Poll (Admins/Owners Only)
app.post('/api/groups/:id/polls', requireAuth, (req, res) => {
    const group = db.groups.find(gr => gr.id === req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found.' });

    const perms = getGroupMemberPerms(group, req.userId);
    if (!perms || (!perms.manageEvents && !perms.manageRanks)) {
        return res.status(403).json({ error: 'Not authorized to create polls.' });
    }

    const { question, options } = req.body;
    if (!question || !options || options.length < 2) return res.status(400).json({ error: 'Invalid poll data.' });

    const newPoll = {
        id: crypto.randomUUID(),
        question: question.trim(),
        options: options.map(o => ({ text: o.trim(), votes: [] })),
        authorName: db.users.find(u => u.id === req.userId).username,
        timestamp: Date.now(),
        active: true
    };

    if (!group.polls) group.polls = [];
    group.polls.unshift(newPoll);
    saveDB();
    res.json({ success: true, polls: group.polls });
});

// Vote on a Group Poll (Members Only)
app.post('/api/groups/:id/polls/:pollId/vote', requireAuth, (req, res) => {
    const group = db.groups.find(gr => gr.id === req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found.' });
    if (!group.members.find(m => m.userId === req.userId)) return res.status(403).json({ error: 'Must be a member to vote.' });

    const poll = group.polls.find(p => p.id === req.params.pollId);
    if (!poll || !poll.active) return res.status(400).json({ error: 'Poll is no longer active.' });

    const { optionIndex } = req.body;

    // Remove their previous vote if they are changing their mind
    poll.options.forEach(o => {
        o.votes = o.votes.filter(id => id !== req.userId);
    });

    // Cast new vote
    if (poll.options[optionIndex]) {
        poll.options[optionIndex].votes.push(req.userId);
    }
    
    saveDB();
    res.json({ success: true });
});


// Manage Group Relations (Owners Only)
app.post('/api/groups/:id/relations', requireAuth, (req, res) => {
    const group = db.groups.find(gr => gr.id === req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found.' });
    
    // Only Group Owners (Rank 255) can manage foreign relations
    const myRank = getGroupMemberRank(group, req.userId);
    if (myRank < 255) return res.status(403).json({ error: 'Only the Group Owner can manage relations.' });

    const { action, target, allowEnemies } = req.body;
    
    if (action === 'settings') {
        group.allowEnemies = !!allowEnemies;
        saveDB();
        return res.json({ success: true, allowEnemies: group.allowEnemies });
    }

    // Find target group by ID or exact Name
    const targetGroup = db.groups.find(gr => gr.id === target || gr.name.toLowerCase() === (target || '').toLowerCase());
    if (!targetGroup && !action.includes('remove')) return res.status(404).json({ error: 'Target group not found.' });
    if (targetGroup && group.id === targetGroup.id) return res.status(400).json({ error: 'Cannot target your own group.' });

    // Initialize arrays if missing
    if (!group.affiliates) group.affiliates = [];
    if (!group.affiliateRequests) group.affiliateRequests = [];
    if (!group.enemies) group.enemies = [];
    if (targetGroup) {
        if (!targetGroup.affiliates) targetGroup.affiliates = [];
        if (!targetGroup.affiliateRequests) targetGroup.affiliateRequests = [];
    }

    if (action === 'request-affiliate') {
        if (group.affiliates.includes(targetGroup.id)) return res.status(400).json({ error: 'Already affiliates.' });
        if (!targetGroup.affiliateRequests.includes(group.id)) targetGroup.affiliateRequests.push(group.id);
    } else if (action === 'accept-affiliate') {
        group.affiliateRequests = group.affiliateRequests.filter(id => id !== targetGroup.id);
        if (!group.affiliates.includes(targetGroup.id)) group.affiliates.push(targetGroup.id);
        if (!targetGroup.affiliates.includes(group.id)) targetGroup.affiliates.push(group.id);
    } else if (action === 'decline-affiliate') {
        group.affiliateRequests = group.affiliateRequests.filter(id => id !== targetGroup.id);
    } else if (action === 'remove-affiliate') {
        group.affiliates = group.affiliates.filter(id => id !== targetGroup.id);
        if(targetGroup) targetGroup.affiliates = targetGroup.affiliates.filter(id => id !== group.id);
    } else if (action === 'declare-enemy') {
        if (!targetGroup.allowEnemies) return res.status(403).json({ error: 'This group does not accept enemies.' });
        if (!group.enemies.includes(targetGroup.id)) group.enemies.push(targetGroup.id);
    } else if (action === 'remove-enemy') {
        group.enemies = group.enemies.filter(id => id !== targetGroup.id);
    }

    saveDB();
    res.json({ success: true });
});

app.get('/api/groups/:id/wall', (req, res) => {
    const group = db.groups.find(gr => gr.id === req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found.' });
    res.json(group.posts.slice(0, 50));
});

app.post('/api/groups/:id/join', requireAuth, (req, res) => {
    const group = db.groups.find(gr => gr.id === req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found.' });
    if (group.banned.includes(req.userId)) return res.status(403).json({ error: 'You are banned from this group.' });
    
    if (!group.members.find(m => m.userId === req.userId)) {
        const defRole = group.roles.find(r => r.rank === 1) || group.roles[group.roles.length-1];
        group.members.push({ userId: req.userId, roleId: defRole.id, joinedAt: Date.now() });
        saveDB();
    }
    res.json({ message: 'Joined group!' });
});

app.post('/api/groups/:id/leave', requireAuth, (req, res) => {
    const group = db.groups.find(gr => gr.id === req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found.' });
    const member = group.members.find(m => m.userId === req.userId);
    if (member && group.ownerId === req.userId) return res.status(400).json({ error: 'Owner cannot leave group.' });
    
    group.members = group.members.filter(m => m.userId !== req.userId);
    saveDB();
    res.json({ message: 'Left group.' });
});

app.post('/api/groups/:id/posts', requireAuth, (req, res) => {
    const { text } = req.body;
    if (!text || text.trim().length === 0) return res.status(400).json({ error: 'Post cannot be empty.' });

    const group = db.groups.find(gr => gr.id === req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found.' });

    if (!group.members.find(m => m.userId === req.userId)) {
        return res.status(403).json({ error: 'Must be a member to post.' });
    }

    const user = db.users.find(u => u.id === req.userId);
    const cleanText = text.trim().substring(0, 200);
    if (isLikelyDuplicateMessage(group.posts || [], user.id, cleanText, 1800)) {
        return res.json({ message: 'Posted successfully!', posts: group.posts.slice(0, 50) });
    }
    const ts = Date.now();
    group.posts.unshift({
        id: crypto.randomUUID(), authorName: user.username, authorId: user.id, text: cleanText, timestamp: ts
    });
    ensureChallengeProgressDay(user);
    user.challengeProgress.groupPosts += 1;
    appendChatLog({
        channel: 'group_wall',
        sourceType: 'group',
        sourceId: group.id,
        groupId: group.id,
        authorId: user.id,
        authorName: user.username,
        text: cleanText,
        timestamp: ts
    });

    addGroupXp(group, 5); // Earn XP for posting
    saveDB();
    res.json({ message: 'Posted successfully!', posts: group.posts.slice(0, 50) });
});

app.delete('/api/groups/:id/posts/:postId', requireAuth, (req, res) => {
    const group = db.groups.find(gr => gr.id === req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found.' });

    const perms = getGroupMemberPerms(group, req.userId);
    if (!perms || !perms.deletePosts) return res.status(403).json({ error: 'Permission denied.' });

    group.posts = group.posts.filter(p => p.id !== req.params.postId);
    saveDB();
    res.json({ success: true });
});

app.post('/api/me/claim-login', requireAuth, (req, res) => {
    const user = db.users.find(u => u.id === req.userId);
    const todayStr = new Date().toDateString();
    const lastLoginStr = user.lastLoginDate ? new Date(user.lastLoginDate).toDateString() : '';

    if (todayStr === lastLoginStr) return res.status(400).json({ error: 'Already claimed today.' });

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (lastLoginStr === yesterday.toDateString()) user.loginStreak += 1;
    else user.loginStreak = 1; // Reset streak if missed

    user.lastLoginDate = Date.now();
    let reward = (user.loginStreak % 7 === 0) ? 150 : 50;
    
    user.coins += reward;
    saveDB();
    res.json({ success: true, coins: user.coins, streak: user.loginStreak, reward });
});

// Admin endpoints
app.post('/api/groups/:id/roles', requireAuth, (req, res) => {
    const group = db.groups.find(gr => gr.id === req.params.id);
    const perms = getGroupMemberPerms(group, req.userId);
    if (!perms || !perms.manageRanks) return res.status(403).json({ error: 'Permission denied.' });

    const { name, rank, permissions } = req.body;
    if (rank >= 255) return res.status(400).json({ error: 'Cannot create a role equal to or higher than Owner.' });
    
    const role = { id: crypto.randomUUID(), name, rank: parseInt(rank) || 10, perms: permissions || {} };
    group.roles.push(role);
    group.roles.sort((a,b) => b.rank - a.rank);
    saveDB();
    res.json({ success: true, roles: group.roles });
});

app.put('/api/groups/:id/members/:userId', requireAuth, (req, res) => {
    const group = db.groups.find(gr => gr.id === req.params.id);
    const perms = getGroupMemberPerms(group, req.userId);
    const myRank = getGroupMemberRank(group, req.userId);
    if (!perms || !perms.manageRanks) return res.status(403).json({ error: 'Permission denied.' });

    const { roleId } = req.body;
    const targetRank = group.roles.find(r => r.id === roleId)?.rank || 0;
    if (targetRank >= myRank) return res.status(403).json({ error: 'Cannot assign a rank equal to or higher than your own.' });

    const targetMem = group.members.find(m => m.userId === req.params.userId);
    const targetCurrentRank = getGroupMemberRank(group, req.params.userId);
    if (targetCurrentRank >= myRank) return res.status(403).json({ error: 'Cannot modify a member with equal or higher rank.' });

    if (targetMem) targetMem.roleId = roleId;
    saveDB();
    res.json({ success: true });
});

app.post('/api/groups/:id/kick/:userId', requireAuth, (req, res) => {
    const group = db.groups.find(gr => gr.id === req.params.id);
    const perms = getGroupMemberPerms(group, req.userId);
    const myRank = getGroupMemberRank(group, req.userId);
    if (!perms || !perms.kick) return res.status(403).json({ error: 'Permission denied.' });

    const targetCurrentRank = getGroupMemberRank(group, req.params.userId);
    if (targetCurrentRank >= myRank) return res.status(403).json({ error: 'Cannot kick a member with equal or higher rank.' });

    group.members = group.members.filter(m => m.userId !== req.params.userId);
    saveDB();
    res.json({ success: true });
});

app.post('/api/groups/:id/categories', requireAuth, (req, res) => {
    const group = db.groups.find(gr => gr.id === req.params.id);
    const perms = getGroupMemberPerms(group, req.userId);
    if (!perms || !perms.manageCategories) return res.status(403).json({ error: 'Permission denied.' });
    if (group.categories.length >= 15) return res.status(400).json({ error: 'Max 15 categories allowed.' });

    const { title, description } = req.body;
    group.categories.push({ id: crypto.randomUUID(), title, description: description || '' });
    saveDB();
    res.json({ success: true, categories: group.categories });
});

app.get('/api/groups/:id/forums/:catId', (req, res) => {
    const group = db.groups.find(gr => gr.id === req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found.' });
    const threads = group.threads.filter(t => t.categoryId === req.params.catId).map(t => ({
        id: t.id, title: t.title, authorName: t.authorName, repliesCount: (t.replies || []).length, timestamp: t.timestamp
    })).sort((a,b) => b.timestamp - a.timestamp);
    res.json(threads);
});

app.post('/api/groups/:id/forums/:catId', requireAuth, (req, res) => {
    const group = db.groups.find(gr => gr.id === req.params.id);
    if (!group.members.find(m => m.userId === req.userId)) return res.status(403).json({ error: 'Members only.' });

    const user = db.users.find(u => u.id === req.userId);
    const { title, content } = req.body;
    const cleanContent = String(content || '').trim().substring(0, 2000);
    if (!cleanContent) return res.status(400).json({ error: 'Content cannot be empty.' });
    const thread = {
        id: crypto.randomUUID(), categoryId: req.params.catId, authorId: user.id, authorName: user.username,
        title, content: cleanContent, timestamp: Date.now(), replies: []
    };
    group.threads.push(thread);
    appendChatLog({
        channel: 'group_forum_thread',
        sourceType: 'group_forum',
        sourceId: thread.id,
        groupId: group.id,
        authorId: user.id,
        authorName: user.username,
        text: `${String(title || '').trim().substring(0, 120)} | ${cleanContent}`,
        timestamp: thread.timestamp,
        meta: { categoryId: req.params.catId }
    });
    addGroupXp(group, 5); // XP for posting thread
    saveDB();
    res.json({ success: true });
});

app.get('/api/groups/:id/threads/:threadId', (req, res) => {
    const group = db.groups.find(gr => gr.id === req.params.id);
    const thread = group.threads.find(t => t.id === req.params.threadId);
    if (!thread) return res.status(404).json({ error: 'Thread not found.' });
    res.json(thread);
});

app.post('/api/groups/:id/threads/:threadId/replies', requireAuth, (req, res) => {
    const group = db.groups.find(gr => gr.id === req.params.id);
    if (!group.members.find(m => m.userId === req.userId)) return res.status(403).json({ error: 'Members only.' });

    const user = db.users.find(u => u.id === req.userId);
    const thread = group.threads.find(t => t.id === req.params.threadId);
    if (!thread) return res.status(404).json({ error: 'Thread not found.' });

    const replyText = String(req.body.content || '').trim().substring(0, 2000);
    if (!replyText) return res.status(400).json({ error: 'Reply cannot be empty.' });
    if (isLikelyDuplicateMessage(thread.replies || [], user.id, replyText, 1800)) {
        return res.json({ success: true, replies: thread.replies });
    }
    const ts = Date.now();
    thread.replies.push({
        id: crypto.randomUUID(), authorId: user.id, authorName: user.username, content: replyText, timestamp: ts
    });
    appendChatLog({
        channel: 'group_forum_reply',
        sourceType: 'group_forum',
        sourceId: thread.id,
        groupId: group.id,
        authorId: user.id,
        authorName: user.username,
        text: replyText,
        timestamp: ts,
        meta: { threadId: thread.id }
    });
    addGroupXp(group, 5); // XP for reply
    saveDB();
    res.json({ success: true, replies: thread.replies });
});

app.post('/api/groups/:id/events', requireAuth, (req, res) => {
    const group = db.groups.find(gr => gr.id === req.params.id);
    const perms = getGroupMemberPerms(group, req.userId);
    if (!perms || !perms.manageEvents) return res.status(403).json({error: 'Permission denied.'});
    
    const { name, description, datetime } = req.body;
    if (!group.events) group.events = [];
    group.events.push({ 
        id: crypto.randomUUID(), name, description, datetime, 
        authorName: db.users.find(u=>u.id===req.userId).username, timestamp: Date.now() 
    });
    saveDB();
    res.json({ success: true, events: group.events });
});

app.post('/api/groups/:id/payout', requireAuth, (req, res) => {
    const group = db.groups.find(gr => gr.id === req.params.id);
    const perms = getGroupMemberPerms(group, req.userId);
    if (!perms || !perms.managePayouts) return res.status(403).json({error: 'Permission denied.'});
    
    const { targetUserId, amount } = req.body;
    const amt = parseInt(amount);
    if (!amt || amt <= 0 || group.coins < amt) return res.status(400).json({error: 'Invalid amount or insufficient group funds.'});
    
    const targetUser = db.users.find(u => u.id === targetUserId);
    if (!targetUser) return res.status(404).json({error: 'User not found.'});
    if (!(group.members || []).some(m => m.userId === targetUser.id)) return res.status(400).json({ error: 'Target user must be a group member.' });
    
    group.coins -= amt;
    targetUser.coins += amt;
    saveDB();
    res.json({ success: true, groupCoins: group.coins });
});


// --- Shop & Economy Routes ---

app.get('/api/shop/items', (req, res) => {
    const approved = (db.shopItems || []).filter(i => (i.status || 'approved') === 'approved');
    res.json(approved.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

app.get('/api/profile-store', requireAuth, (req, res) => {
    const user = db.users.find(u => u.id === req.userId);
    const owned = new Set(user.profileItems || []);
    const equippedSet = new Set(user.equippedProfileCosmetics || (user.equippedProfileCosmetic ? [user.equippedProfileCosmetic] : []));
    const games = (db.games || []).filter(g => g.authorId === user.id).map(g => ({ id: g.id, title: g.title }));
    res.json({
        themes: PROFILE_THEME_CATALOG.map(t => ({ ...t, owned: owned.has(t.id), equipped: user.equippedProfileTheme === t.id })),
        cosmetics: PROFILE_COSMETIC_CATALOG.map(c => ({ ...c, owned: owned.has(c.id), equipped: equippedSet.has(c.id) })),
        textStyle: user.profileTextStyle || { font: 'default', color: '#2c3e50' },
        pinned: user.profilePinnedGame || { enabled: false, gameId: null, description: '' },
        profileWorld: user.profileWorld || { equipped: false, gameIds: [], assetIds: [], greeting: '' },
        games
    });
});

app.post('/api/profile-store/buy/:itemId', requireAuth, (req, res) => {
    const user = db.users.find(u => u.id === req.userId);
    const item = getProfileStoreItem(req.params.itemId);
    if (!item) return res.status(404).json({ error: 'Item not found.' });
    if (!user.profileItems) user.profileItems = [];
    if (user.profileItems.includes(item.id)) return res.status(400).json({ error: 'Already owned.' });
    if ((user.coins || 0) < item.price) return res.status(400).json({ error: 'Insufficient funds.' });
    user.coins -= item.price;
    user.profileItems.push(item.id);
    saveDB();
    res.json({ success: true, coins: user.coins, itemId: item.id });
});

app.post('/api/profile-store/equip-theme', requireAuth, (req, res) => {
    const user = db.users.find(u => u.id === req.userId);
    const { itemId } = req.body || {};
    if (!itemId) {
        user.equippedProfileTheme = null;
        saveDB();
        return res.json({ success: true, equippedProfileTheme: null });
    }
    const item = PROFILE_THEME_CATALOG.find(t => t.id === itemId);
    if (!item) return res.status(404).json({ error: 'Theme not found.' });
    if (!(user.profileItems || []).includes(item.id)) return res.status(403).json({ error: 'Theme not owned.' });
    user.equippedProfileTheme = item.id;
    saveDB();
    res.json({ success: true, equippedProfileTheme: user.equippedProfileTheme });
});

app.post('/api/profile-store/equip-cosmetic', requireAuth, (req, res) => {
    const user = db.users.find(u => u.id === req.userId);
    const { itemId } = req.body || {};
    if (!Array.isArray(user.equippedProfileCosmetics)) user.equippedProfileCosmetics = (user.equippedProfileCosmetic ? [user.equippedProfileCosmetic] : []);
    if (!itemId) return res.status(400).json({ error: 'itemId required.' });
    const item = PROFILE_COSMETIC_CATALOG.find(c => c.id === itemId);
    if (!item) return res.status(404).json({ error: 'Cosmetic not found.' });
    if (!(user.profileItems || []).includes(item.id)) return res.status(403).json({ error: 'Cosmetic not owned.' });
    const alreadyEquipped = user.equippedProfileCosmetics.includes(item.id);
    if (alreadyEquipped) {
        user.equippedProfileCosmetics = user.equippedProfileCosmetics.filter(id => id !== item.id);
        if (item.id === 'cosmetic_pinned_game_feature') {
            if (!user.profilePinnedGame) user.profilePinnedGame = { enabled: false, gameId: null, description: '' };
            user.profilePinnedGame.enabled = false;
        }
        if (item.id === 'cosmetic_profile_worlds') {
            if (!user.profileWorld) user.profileWorld = { equipped: false, gameIds: [], assetIds: [], greeting: '' };
            user.profileWorld.equipped = false;
        }
        if (item.id === 'cosmetic_profile_font_chooser' && user.profileTextStyle) user.profileTextStyle.font = 'default';
        if (item.id === 'cosmetic_profile_text_color' && user.profileTextStyle) user.profileTextStyle.color = '#2c3e50';
    } else {
        user.equippedProfileCosmetics.push(item.id);
        if (item.id === 'cosmetic_profile_worlds') {
            if (!user.profileWorld) user.profileWorld = { equipped: false, gameIds: [], assetIds: [], greeting: '' };
            user.profileWorld.equipped = true;
        }
    }
    user.equippedProfileCosmetic = user.equippedProfileCosmetics[0] || null;
    saveDB();
    res.json({ success: true, equippedProfileCosmetic: user.equippedProfileCosmetic, equippedProfileCosmetics: user.equippedProfileCosmetics });
});

app.post('/api/profile-store/pinned-game', requireAuth, (req, res) => {
    const user = db.users.find(u => u.id === req.userId);
    const equipped = new Set(user.equippedProfileCosmetics || (user.equippedProfileCosmetic ? [user.equippedProfileCosmetic] : []));
    if (!equipped.has('cosmetic_pinned_game_feature')) return res.status(403).json({ error: 'Pinned Game cosmetic must be equipped.' });
    const { gameId, description, enabled } = req.body || {};
    if (!user.profilePinnedGame) user.profilePinnedGame = { enabled: false, gameId: null, description: '' };
    const desc = String(description || '').slice(0, 180);
    if (!enabled) {
        user.profilePinnedGame = { enabled: false, gameId: null, description: desc };
        saveDB();
        return res.json({ success: true, profilePinnedGame: user.profilePinnedGame });
    }
    const game = (db.games || []).find(g => g.id === gameId && g.authorId === user.id);
    if (!game) return res.status(400).json({ error: 'You can only pin games you created.' });
    user.profilePinnedGame = { enabled: true, gameId: game.id, description: desc };
    saveDB();
    res.json({ success: true, profilePinnedGame: user.profilePinnedGame });
});

app.post('/api/profile-store/text-style', requireAuth, (req, res) => {
    const user = db.users.find(u => u.id === req.userId);
    const equipped = new Set(user.equippedProfileCosmetics || (user.equippedProfileCosmetic ? [user.equippedProfileCosmetic] : []));
    const { font, color } = req.body || {};
    const FONT_OPTIONS = ['default', 'Inter', 'Georgia', 'Courier New', 'Trebuchet MS', 'Verdana', 'Palatino', 'Comic Sans MS', 'Impact'];
    if (!user.profileTextStyle) user.profileTextStyle = { font: 'default', color: '#2c3e50' };
    if (font !== undefined) {
        if (!equipped.has('cosmetic_profile_font_chooser')) return res.status(403).json({ error: 'Font chooser cosmetic must be equipped.' });
        const cleanFont = FONT_OPTIONS.includes(String(font)) ? String(font) : 'default';
        user.profileTextStyle.font = cleanFont;
    }
    if (color !== undefined) {
        if (!equipped.has('cosmetic_profile_text_color')) return res.status(403).json({ error: 'Text color cosmetic must be equipped.' });
        const colorStr = String(color || '').trim();
        if (!/^#[0-9a-fA-F]{6}$/.test(colorStr)) return res.status(400).json({ error: 'Invalid color format.' });
        user.profileTextStyle.color = colorStr;
    }
    saveDB();
    res.json({ success: true, profileTextStyle: user.profileTextStyle });
});

app.get('/api/profile-world/me', requireAuth, (req, res) => {
    const user = db.users.find(u => u.id === req.userId);
    if (!user.profileWorld) user.profileWorld = { equipped: false, gameIds: [], assetIds: [], greeting: '' };
    const ownedGames = (db.games || []).filter(g => g.authorId === user.id).map(g => ({ id: g.id, title: g.title }));
    const ownedAssets = (db.toolboxItems || []).filter(i => i.authorId === user.id).map(i => ({ id: i.id, name: i.name }));
    res.json({ profileWorld: user.profileWorld, ownedGames, ownedAssets });
});

app.post('/api/profile-world/config', requireAuth, (req, res) => {
    const user = db.users.find(u => u.id === req.userId);
    if (!user.profileWorld) user.profileWorld = { equipped: false, gameIds: [], assetIds: [], greeting: '' };
    const equipped = new Set(user.equippedProfileCosmetics || (user.equippedProfileCosmetic ? [user.equippedProfileCosmetic] : []));
    if (!equipped.has('cosmetic_profile_worlds')) return res.status(403).json({ error: 'Profile Worlds must be equipped.' });
    const gameIdsRaw = Array.isArray(req.body.gameIds) ? req.body.gameIds : [];
    const assetIdsRaw = Array.isArray(req.body.assetIds) ? req.body.assetIds : [];
    const greeting = String(req.body.greeting || '').slice(0, 300);
    const ownedGameSet = new Set((db.games || []).filter(g => g.authorId === user.id).map(g => g.id));
    const ownedAssetSet = new Set((db.toolboxItems || []).filter(i => i.authorId === user.id).map(i => i.id));
    user.profileWorld.gameIds = gameIdsRaw.map(id => String(id)).filter(id => ownedGameSet.has(id)).slice(0, 3);
    user.profileWorld.assetIds = assetIdsRaw.map(id => String(id)).filter(id => ownedAssetSet.has(id)).slice(0, 4);
    user.profileWorld.greeting = greeting;
    user.profileWorld.equipped = true;
    saveDB();
    res.json({ success: true, profileWorld: user.profileWorld });
});

app.get('/api/profile-world/:username', (req, res) => {
    const user = db.users.find(u => String(u.username || '').toLowerCase() === String(req.params.username || '').toLowerCase());
    if (!user) return res.status(404).json({ error: 'User not found.' });
    if (!user.profileWorld || !user.profileWorld.equipped) return res.status(404).json({ error: 'Profile world not equipped.' });
    const gameIds = (user.profileWorld.gameIds || []).slice(0, 3);
    const assetIds = (user.profileWorld.assetIds || []).slice(0, 4);
    const games = gameIds.map(id => (db.games || []).find(g => g.id === id && g.authorId === user.id)).filter(Boolean).map(g => ({ id: g.id, title: g.title }));
    const assets = assetIds.map(id => (db.toolboxItems || []).find(i => i.id === id && i.authorId === user.id)).filter(Boolean).map(i => ({ id: i.id, name: i.name }));
    res.json({ ownerName: user.username, greeting: String(user.profileWorld.greeting || '').slice(0, 300), games, assets });
});

app.post('/api/shop/items', requireAuth, (req, res) => {
    const { name, description, price, image } = req.body;
    if (!name || !image) return res.status(400).json({ error: 'Missing required data.' });

    const user = db.users.find(u => u.id === req.userId);
    const accountAgeMs = Date.now() - (user.createdAt || 0);
    const minAgeMs = 3 * 24 * 60 * 60 * 1000;
    if (accountAgeMs < minAgeMs) {
        const hoursLeft = Math.ceil((minAgeMs - accountAgeMs) / (60 * 60 * 1000));
        return res.status(403).json({ error: `Account must be at least 3 days old to upload accessories. (${hoursLeft}h remaining)` });
    }
    if (user.coins < 20) return res.status(400).json({ error: 'Insufficient Funds. Uploading costs 20 SC.' });
    user.coins -= 20;

    const newItem = {
        id: crypto.randomUUID(), name, description: description || '', price: parseInt(price) || 0,
        authorId: user.id, authorName: user.username, image, createdAt: new Date().toISOString(),
        status: 'pending', moderation: { reviewedBy: null, reviewedAt: null, reason: '' }
    };
    
    db.shopItems.push(newItem);
    user.inventory.push(newItem.id); 
    saveDB();
    
    res.json({ message: 'Accessory submitted for moderation review.', item: newItem, coins: user.coins });
});

app.post('/api/shop/buy/:id', requireAuth, (req, res) => {
    const item = db.shopItems.find(i => i.id === req.params.id);
    const user = db.users.find(u => u.id === req.userId);
    
    if (!item) return res.status(404).json({ error: 'Item not found.' });
    if ((item.status || 'approved') !== 'approved') return res.status(400).json({ error: 'This item is not approved for sale yet.' });
    if (user.inventory.includes(item.id)) return res.status(400).json({ error: 'You already own this item.' });
    if (user.coins < item.price) return res.status(400).json({ error: 'Insufficient Funds.' });
    
    user.coins -= item.price;
    user.inventory.push(item.id);
    ensureChallengeProgressDay(user);
    user.challengeProgress.purchases += 1;
    const author = db.users.find(u => u.id === item.authorId);
    if (author) author.coins = (author.coins || 0) + item.price;
    saveDB();
    res.json({ message: 'Item purchased successfully!', coins: user.coins });
});

app.get('/api/clothing/items', (req, res) => {
    const approved = (db.clothingItems || []).filter(i => i.visibility === 'public' && (i.status || 'approved') === 'approved');
    res.json(approved.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

app.post('/api/clothing/items', requireAuth, (req, res) => {
    const { name, description, price, type, visibility, designImage } = req.body;
    if (!name || !description || !designImage) return res.status(400).json({ error: 'Missing required clothing data.' });
    if (!['shirt', 'pants'].includes(type)) return res.status(400).json({ error: 'Invalid clothing type.' });
    if (!['public', 'private'].includes(visibility)) return res.status(400).json({ error: 'Invalid visibility.' });
    const user = db.users.find(u => u.id === req.userId);
    const item = {
        id: crypto.randomUUID(),
        name,
        description,
        price: Math.max(0, parseInt(price) || 0),
        type,
        visibility,
        designImage,
        authorId: user.id,
        authorName: user.username,
        createdAt: new Date().toISOString(),
        status: visibility === 'public' ? 'pending' : 'approved',
        moderation: { reviewedBy: null, reviewedAt: null, reason: '' }
    };
    db.clothingItems.push(item);
    if (!Array.isArray(user.clothingInventory)) user.clothingInventory = [];
    if (!user.clothingInventory.includes(item.id)) user.clothingInventory.push(item.id);
    saveDB();
    res.json({ message: visibility === 'public' ? 'Clothing submitted for moderation.' : 'Private clothing created.', item });
});

app.get('/api/me/clothing-inventory', requireAuth, (req, res) => {
    const user = db.users.find(u => u.id === req.userId);
    const items = (user.clothingInventory || []).map(id => (db.clothingItems || []).find(i => i.id === id)).filter(Boolean);
    res.json({ items, equippedShirt: user.equippedShirt || null, equippedPants: user.equippedPants || null });
});

app.post('/api/clothing/buy/:id', requireAuth, (req, res) => {
    const item = (db.clothingItems || []).find(i => i.id === req.params.id);
    const user = db.users.find(u => u.id === req.userId);
    if (!item) return res.status(404).json({ error: 'Clothing not found.' });
    if (item.visibility !== 'public' || (item.status || 'approved') !== 'approved') return res.status(400).json({ error: 'Clothing is not available for purchase.' });
    if ((user.clothingInventory || []).includes(item.id)) return res.status(400).json({ error: 'You already own this clothing item.' });
    if (user.coins < item.price) return res.status(400).json({ error: 'Insufficient Funds.' });
    user.coins -= item.price;
    if (!Array.isArray(user.clothingInventory)) user.clothingInventory = [];
    user.clothingInventory.push(item.id);
    ensureChallengeProgressDay(user);
    user.challengeProgress.purchases += 1;
    const author = db.users.find(u => u.id === item.authorId);
    if (author) author.coins = (author.coins || 0) + item.price;
    saveDB();
    res.json({ success: true, coins: user.coins });
});

app.post('/api/clothing/equip', requireAuth, (req, res) => {
    const { itemId } = req.body;
    const user = db.users.find(u => u.id === req.userId);
    if (!itemId) {
        user.equippedShirt = null; user.equippedPants = null; saveDB();
        return res.json({ equippedShirt: null, equippedPants: null });
    }
    if (!(user.clothingInventory || []).includes(itemId)) return res.status(403).json({ error: 'Not owned.' });
    const item = (db.clothingItems || []).find(i => i.id === itemId);
    if (!item) return res.status(404).json({ error: 'Clothing not found.' });
    if (item.type === 'shirt') user.equippedShirt = item.id;
    if (item.type === 'pants') user.equippedPants = item.id;
    saveDB();
    res.json({ equippedShirt: user.equippedShirt || null, equippedPants: user.equippedPants || null });
});

// --- Game Routes ---
// Get Games Library (Search & Filter)
app.get('/api/games', (req, res) => {
    let results = [...db.games];
    if (req.query.q) {
        const q = req.query.q.toLowerCase();
        results = results.filter(g => g.title.toLowerCase().includes(q) || g.authorName.toLowerCase().includes(q));
    }
    if (req.query.genre && req.query.genre !== 'All') {
        results = results.filter(g => g.genre === req.query.genre);
    }
    results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const list = results.map(g => ({
        id: g.id, title: g.title, authorName: g.authorName, genre: g.genre, likes: g.likes.length, plays: g.plays, groupId: g.groupId
    }));
    res.json(list);
});


// --- PLAYSCULPT DATASTORES ---
app.post('/api/games/:id/datastore', requireAuth, (req, res) => {
    const { key, value } = req.body;
    if (!db.datastores[req.params.id]) db.datastores[req.params.id] = {};
    if (!db.datastores[req.params.id][req.userId]) db.datastores[req.params.id][req.userId] = {};
    
    db.datastores[req.params.id][req.userId][key] = value;
    saveDB();
    res.json({ success: true });
});

app.get('/api/games/:id/datastore/:key', requireAuth, (req, res) => {
    const val = db.datastores[req.params.id]?.[req.userId]?.[req.params.key];
    res.json({ value: val !== undefined ? val : null });
});



// 2. Publish New Version
app.post('/api/games/:id/publish', requireAuth, (req, res) => {
    const game = db.games.find(g => g.id === req.params.id);
    if (!game) return res.status(404).json({ error: 'Game not found.' });

    let canEdit = game.authorId === req.userId || game.collaborators.includes(req.userId);
    if (game.groupId) {
        const group = db.groups.find(gr => gr.id === game.groupId);
        const perms = getGroupMemberPerms(group, req.userId);
        if (perms && perms.editGames) canEdit = true;
    }
    if (!canEdit) return res.status(403).json({ error: 'Not authorized.' });

    const { gameData, genre } = req.body;
    const safeGameData = sanitizeGameData(gameData || {});
    game.gameData = safeGameData;
    if (genre) game.genre = genre;
    game.lastEditTime = Date.now();

    if (!game.versions) game.versions = [];
    game.versions.push({ versionId: game.versions.length + 1, timestamp: Date.now(), gameData: JSON.parse(JSON.stringify(safeGameData)) });
    const author = db.users.find(u => u.id === req.userId);
    if (author) {
        ensureChallengeProgressDay(author);
        author.challengeProgress.publishes += 1;
    }

    saveDB();
    res.json({ success: true, versionId: game.versions.length });
});


// 3. Fetch Version List (Metadata Only)
app.get('/api/games/:id/versions', requireAuth, (req, res) => {
    const game = db.games.find(g => g.id === req.params.id);
    if (!game) return res.status(404).json({ error: 'Game not found.' });
    const versionList = (game.versions || []).map(v => ({ versionId: v.versionId, timestamp: v.timestamp })).reverse();
    res.json(versionList);
});

// 4. Fetch Specific Version Data
app.get('/api/games/:id/versions/:vId', requireAuth, (req, res) => {
    const game = db.games.find(g => g.id === req.params.id);
    if (!game) return res.status(404).json({ error: 'Game not found.' });
    const v = game.versions.find(ver => ver.versionId === parseInt(req.params.vId));
    if (!v) return res.status(404).json({ error: 'Version not found.' });
    res.json({ gameData: v.gameData });
});

// 5. Sound Service Routes
app.post('/api/sounds', requireAuth, (req, res) => {
    const { name, data } = req.body;
    if (!name || !data) return res.status(400).json({ error: 'Missing data' });
    const user = db.users.find(u => u.id === req.userId);
    const newSound = { id: crypto.randomUUID(), name, data, authorId: user.id, authorName: user.username, createdAt: Date.now() };
    db.sounds.push(newSound);
    saveDB();
    res.json({ success: true, soundId: newSound.id });
});

app.get('/api/sounds', (req, res) => {
    res.json(db.sounds.map(s => ({ id: s.id, name: s.name, authorName: s.authorName })).reverse());
});

app.get('/api/sounds/:id', (req, res) => {
    const sound = db.sounds.find(s => s.id === req.params.id);
    if (!sound) return res.status(404).json({ error: 'Not found' });
    res.json({ data: sound.data });
});

app.post('/api/tools/schem-to-obj', requireAuth, express.raw({ type: 'application/octet-stream', limit: '100mb' }), (req, res) => {
    try {
        let inputBuffer = null;
        if (Buffer.isBuffer(req.body) && req.body.length) {
            inputBuffer = req.body;
        } else {
            const b64 = String(req.body?.schemBase64 || '');
            if (b64) inputBuffer = Buffer.from(b64, 'base64');
        }
        if (!inputBuffer || !inputBuffer.length) return res.status(400).json({ error: 'Missing schematic payload (octet-stream body or schemBase64).' });
        const converted = buildObjFromSchematic(inputBuffer);
        res.json(converted);
    } catch (e) {
        res.status(400).json({ error: `Schematic conversion failed: ${e.message}` });
    }
});



app.get('/api/games/most-liked', (req, res) => {
    const mostLiked = [...db.games]
        .sort((a, b) => b.likes.length - a.likes.length)
        .slice(0, 4)
        .map(g => ({ id: g.id, title: g.title, authorName: g.authorName, genre: g.genre, likes: g.likes.length, plays: g.plays, groupId: g.groupId }));
    res.json(mostLiked);
});

app.get('/api/games/fresh', (req, res) => {
    const fresh = [...db.games]
        .sort((a, b) => {
            const tA = a.lastEditTime || new Date(a.createdAt).getTime();
            const tB = b.lastEditTime || new Date(b.createdAt).getTime();
            return tB - tA;
        })
        .slice(0, 4)
        .map(g => ({ id: g.id, title: g.title, authorName: g.authorName, genre: g.genre, likes: g.likes.length, plays: g.plays, groupId: g.groupId }));
    res.json(fresh);
});

app.get('/api/my-games', requireAuth, (req, res) => {
    const userGroups = db.groups.filter(gr => {
        const perms = getGroupMemberPerms(gr, req.userId);
        return perms && perms.editGames;
    });
    const groupIds = userGroups.map(gr => gr.id);

    const myGames = db.games.filter(g => 
        g.authorId === req.userId || 
        g.collaborators.includes(req.userId) ||
        (g.groupId && groupIds.includes(g.groupId))
    ).map(g => ({
        id: g.id, title: g.title, authorName: g.authorName, genre: g.genre, likes: g.likes.length, plays: g.plays, groupId: g.groupId
    }));
    res.json(myGames);
});

app.get('/api/games/trending', (req, res) => {
    // Sort games by highest play count
    const trending = [...db.games]
        .sort((a, b) => (b.plays || 0) - (a.plays || 0))
        .slice(0, 4)
        .map(g => ({ 
            id: g.id, 
            title: g.title, 
            authorName: g.authorName, 
            genre: g.genre, 
            likes: g.likes.length, 
            plays: g.plays, 
            groupId: g.groupId 
        }));
    res.json(trending);
});


// PUBLISH NEW GAME
app.post('/api/games', requireAuth, (req, res) => {
    const { title, gameData, genre, groupId, icon, thumbnails } = req.body;
    if (!title || !gameData) return res.status(400).json({ error: 'Missing game data.' });
    const safeGameData = sanitizeGameData(gameData);
    const safeTitle = sanitizeText(title, 80);
    
    const user = db.users.find(u => u.id === req.userId);
    let authorName = user.username;

    if (groupId) {
        const group = db.groups.find(gr => gr.id === groupId);
        const perms = getGroupMemberPerms(group, req.userId);
        if (!group || !perms || !perms.editGames) return res.status(403).json({ error: 'Not authorized.' });
        authorName = group.name; 
    }

    const newGame = {
        id: crypto.randomUUID(), title: safeTitle, authorId: user.id, authorName: authorName, genre: genre || 'Sandbox',
        groupId: groupId || null, gameData: safeGameData, lastEditTime: Date.now(), collaborators: [], likes: [], plays: 0, updates: [],
        createdAt: new Date().toISOString(),
        versions: [{ versionId: 1, timestamp: Date.now(), gameData: safeGameData }],
        analytics: { uniquePlayers: [], totalSessionTimeSeconds: 0, fallOffs: 0, peakCCU: 0, desktopSessions: 0, mobileSessions: 0, totalJumps: 0 },
        
        // NEW: Image fields
        icon: null, // Active square icon
        pendingIcon: icon || null, // Awaiting admin approval
        thumbnails: [], // Active horizontal thumbnails
        pendingThumbnails: (thumbnails || []).slice(0, 10).map(t => ({ id: crypto.randomUUID(), data: t })) // Max 10
    };
    db.games.push(newGame);
    saveDB();
res.json({ success: true, gameId: newGame.id, message: "Game published! Images are awaiting Admin approval." });
});

app.post('/api/me/lucky-spin', requireAuth, (req, res) => {
    const user = db.users.find(u => u.id === req.userId);
    const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    
    // Check if 7 days have passed since the last spin
    if (Date.now() - (user.lastSpinDate || 0) < WEEK_MS) {
        return res.status(400).json({ error: 'You can only spin once a week!' });
    }

    const rewards = [
        { type: 'coins', val: 100, label: '100 SC' },
        { type: 'coins', val: 200, label: '200 SC' },
        { type: 'coins', val: 350, label: '350 SC' },
        { type: 'badge', val: 'Lucky Spinner', label: 'Lucky Spinner Badge' }
    ];
    
    // Weighted Randomness (10% chance for badge, 40% chance for 100 SC, etc.)
    const r = Math.random();
    let reward;
    if (r < 0.4) reward = rewards[0]; 
    else if (r < 0.7) reward = rewards[1]; 
    else if (r < 0.9) reward = rewards[2]; 
    else reward = rewards[3]; 

    if (reward.type === 'coins') {
        user.coins += reward.val;
    } else if (reward.type === 'badge') {
        if (!user.badges.includes(reward.val)) {
            user.badges.push(reward.val);
        } else {
            // If they already have the badge, give them a jackpot of SC instead!
            user.coins += 150;
            reward = { type: 'coins', val: 150, label: '150 SC (Badge Duplicate)' };
        }
    }

    user.lastSpinDate = Date.now();
    saveDB();
    res.json({ success: true, reward, coins: user.coins });
});

app.get('/api/games/random', (req, res) => {
    if (db.games.length === 0) return res.status(404).json({ error: 'No games found.' });
    const randomGame = db.games[Math.floor(Math.random() * db.games.length)];
    res.json({ id: randomGame.id });
});


// Admin Image Moderation Queue
app.get('/api/moderate/images', requireAuth, (req, res) => {
    const adminUser = db.users.find(u => u.id === req.userId);
    if (!adminUser || adminUser.username.toLowerCase() !== 'admin') return res.status(403).json({ error: 'Admins only.' });
    
    let queue = [];
    db.games.forEach(g => {
        if (g.pendingIcon) queue.push({ type: 'icon', gameId: g.id, gameTitle: g.title, data: g.pendingIcon });
        if (g.pendingThumbnails) {
            g.pendingThumbnails.forEach(t => queue.push({ type: 'thumbnail', gameId: g.id, imageId: t.id, gameTitle: g.title, data: t.data }));
        }
    });
    res.json(queue);
});

app.post('/api/moderate/images', requireAuth, (req, res) => {
    const adminUser = db.users.find(u => u.id === req.userId);
    if (!adminUser || adminUser.username.toLowerCase() !== 'admin') return res.status(403).json({ error: 'Admins only.' });
    
    const { gameId, type, imageId, action } = req.body; // action: 'approve' or 'deny'
    const game = db.games.find(g => g.id === gameId);
    if (!game) return res.status(404).json({ error: 'Game not found' });

    if (type === 'icon') {
        if (action === 'approve') game.icon = game.pendingIcon;
        game.pendingIcon = null;
    } else if (type === 'thumbnail') {
        const thumb = game.pendingThumbnails.find(t => t.id === imageId);
        if (thumb && action === 'approve') game.thumbnails.push(thumb.data);
        game.pendingThumbnails = game.pendingThumbnails.filter(t => t.id !== imageId);
    }
    
    saveDB();
    res.json({ success: true });
});

app.get('/api/moderate/accessories', requireAuth, requireModerator, requireModPanelUnlocked, (req, res) => {
    const pending = (db.shopItems || [])
        .filter(i => (i.status || 'approved') === 'pending')
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    res.json(pending);
});

app.post('/api/moderate/accessories/:id', requireAuth, requireModerator, requireModPanelUnlocked, (req, res) => {
    const { action, reason } = req.body; // approve | reject
    const item = (db.shopItems || []).find(i => i.id === req.params.id);
    if (!item) return res.status(404).json({ error: 'Accessory not found.' });
    if ((item.status || 'approved') !== 'pending') return res.status(400).json({ error: 'Accessory is not pending moderation.' });
    if (!['approve', 'reject'].includes(action)) return res.status(400).json({ error: 'Invalid action.' });

    item.status = action === 'approve' ? 'approved' : 'rejected';
    item.moderation = {
        reviewedBy: req.userId,
        reviewedAt: Date.now(),
        reason: String(reason || '').slice(0, 300)
    };

    if (action === 'reject') {
        db.users.forEach(u => {
            if (Array.isArray(u.inventory)) u.inventory = u.inventory.filter(id => id !== item.id);
        });
    }

    saveDB();
    res.json({ success: true, item });
});

app.get('/api/moderate/clothing', requireAuth, requireModerator, requireModPanelUnlocked, (req, res) => {
    const pending = (db.clothingItems || [])
        .filter(i => i.visibility === 'public' && (i.status || 'approved') === 'pending')
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    res.json(pending);
});

app.post('/api/moderate/clothing/:id', requireAuth, requireModerator, requireModPanelUnlocked, (req, res) => {
    const { action, reason } = req.body;
    const item = (db.clothingItems || []).find(i => i.id === req.params.id);
    if (!item) return res.status(404).json({ error: 'Clothing not found.' });
    if ((item.status || 'approved') !== 'pending') return res.status(400).json({ error: 'Clothing is not pending moderation.' });
    if (!['approve', 'reject'].includes(action)) return res.status(400).json({ error: 'Invalid action.' });
    item.status = action === 'approve' ? 'approved' : 'rejected';
    item.moderation = { reviewedBy: req.userId, reviewedAt: Date.now(), reason: String(reason || '').slice(0, 300) };
    if (action === 'reject') {
        db.users.forEach(u => {
            if (Array.isArray(u.clothingInventory)) u.clothingInventory = u.clothingInventory.filter(id => id !== item.id);
        });
    }
    saveDB();
    res.json({ success: true, item });
});

app.get('/api/games/:id', (req, res) => {
    const game = db.games.find(g => g.id === req.params.id);
    if (!game) return res.status(404).json({ error: 'Game not found.' });
    
    let isLiked = false;
    let isBookmarked = false;
    const token = req.headers.authorization;
    if (token && db.sessions[token]) {
        const userId = db.sessions[token];
        if (game.likes.includes(userId)) isLiked = true;
        const user = db.users.find(u => u.id === userId);
        if (user && user.bookmarks.includes(game.id)) isBookmarked = true;
    }
    res.json({ ...game, likesCount: game.likes.length, isLiked, isBookmarked, updates: game.updates || [] });
});

app.post('/api/games/:id/updates', requireAuth, (req, res) => {
    const game = db.games.find(g => g.id === req.params.id);
    if (!game) return res.status(404).json({ error: 'Game not found.' });
    
    let canEdit = game.authorId === req.userId || game.collaborators.includes(req.userId);
    if (game.groupId) {
        const group = db.groups.find(gr => gr.id === game.groupId);
        const perms = getGroupMemberPerms(group, req.userId);
        if (perms && perms.editGames) canEdit = true;
    }

    if (!canEdit) return res.status(403).json({ error: 'Not authorized to post updates.' });
    if (!req.body.title || req.body.title.trim().length === 0) return res.status(400).json({ error: 'Update title cannot be empty.' });
    if (!req.body.text || req.body.text.trim().length === 0) return res.status(400).json({ error: 'Update description cannot be empty.' });

    if (!game.updates) game.updates = [];
    game.updates.unshift({
        title: req.body.title.trim().substring(0, 80),
        text: req.body.text.trim().substring(0, 400),
        timestamp: Date.now()
    });
    
    saveDB();
    res.json({ success: true, updates: game.updates });
});


// ==========================================
// LIVE ONLINE TRACKING
// ==========================================
app.post('/api/ping', requireAuth, (req, res) => {
    const { location } = req.body;
    
    // Update this user's last seen time and location
    onlineUsers[req.userId] = {
        lastSeen: Date.now(),
        location: location || 'website'
    };

    const now = Date.now();
    let totalOnline = 0;
    let cityOnline = 0;

    // Count active users and kick out AFK/Disconnected users (no ping for 30 seconds)
    for (let uid in onlineUsers) {
        const slot = onlineUsers[uid];
        const lastSeen = typeof slot === 'number' ? slot : (slot && typeof slot.lastSeen === 'number' ? slot.lastSeen : 0);
        const location = (slot && typeof slot === 'object' && slot.location) ? slot.location : 'website';
        if (now - lastSeen > 30000) {
            delete onlineUsers[uid];
        } else {
            totalOnline++;
            if (location === 'city') cityOnline++;
        }
    }

    res.json({ totalOnline, cityOnline });
});

// Analytics Data Receiver
// Analytics Data Receiver
app.post('/api/games/:id/track', requireAuth, (req, res) => {
    const game = db.games.find(g => g.id === req.params.id);
    if (!game) return res.status(404).json({ error: 'Game not found.' });

    // FIX: Initialize analytics if it doesn't exist (prevents the 500 crash)
    if (!game.analytics) {
        game.analytics = {
            uniquePlayers: [],
            totalSessionTimeSeconds: 0,
            fallOffs: 0,
            peakCCU: 0,
            desktopSessions: 0,
            mobileSessions: 0,
            totalJumps: 0
        };
    }

    const { sessionTimeSeconds, jumps, falls, isMobile } = req.body;
    
    // Add unique player if not already tracked
    if (!game.analytics.uniquePlayers.includes(req.userId)) {
        game.analytics.uniquePlayers.push(req.userId);
    }
    
    // Aggregate metrics
    const safeSessionSeconds = Math.max(0, Math.min(6 * 3600, Number(sessionTimeSeconds) || 0));
    game.analytics.totalSessionTimeSeconds += safeSessionSeconds;
    game.analytics.totalJumps += (jumps || 0);
    game.analytics.fallOffs += (falls || 0);
    
    if (isMobile) game.analytics.mobileSessions += 1;
    else game.analytics.desktopSessions += 1;
    
    // Update Peak CCU 
    if (activePlayers[game.id]) {
        const currentCCU = Object.keys(activePlayers[game.id]).length;
        if (currentCCU > game.analytics.peakCCU) {
            game.analytics.peakCCU = currentCCU;
        }
    }

    if (!game.creatorRewards) game.creatorRewards = { totalCoinsAwarded: 0, playerSeconds: {} };
    if (req.userId !== game.authorId) {
        const prev = game.creatorRewards.playerSeconds[req.userId] || 0;
        const next = prev + safeSessionSeconds;
        const prevBlocks = Math.floor(prev / (20 * 60));
        const nextBlocks = Math.floor(next / (20 * 60));
        const blocksEarned = Math.max(0, nextBlocks - prevBlocks);
        if (blocksEarned > 0) {
            const creator = db.users.find(u => u.id === game.authorId);
            if (creator) {
                const coins = blocksEarned * 10;
                creator.coins = (creator.coins || 0) + coins;
                game.creatorRewards.totalCoinsAwarded += coins;
            }
        }
        game.creatorRewards.playerSeconds[req.userId] = next;
    }

    saveDB();
    res.json({ success: true });
});

// Analytics Fetch Endpoint (Restricted to Creators & Group Admins)
app.get('/api/games/:id/analytics', requireAuth, (req, res) => {
    const game = db.games.find(g => g.id === req.params.id);
    if (!game) return res.status(404).json({ error: 'Game not found.' });
    
    let canView = game.authorId === req.userId;
    if (game.groupId) {
        const group = db.groups.find(gr => gr.id === game.groupId);
        const mem = group?.members.find(m => m.userId === req.userId);
        const role = group?.roles.find(r => r.id === mem?.roleId);
        if (role && role.perms.editGames) canView = true;
    }
    
    if (!canView) return res.status(403).json({ error: 'Not authorized.' });

    const creatorLeague = computeCreatorLeagueForUser(game.authorId);
    res.json({
        plays: game.plays,
        likes: game.likes.length,
        analytics: game.analytics,
        creatorRewards: {
            totalCoinsAwarded: game.creatorRewards?.totalCoinsAwarded || 0,
            trackedPlayerSeconds: game.creatorRewards?.playerSeconds || {}
        },
        creatorLeague
    });
});


// --- SCULPT CITY ROUTES ---
// ==========================================
// SCULPT CITY ROUTES
// ==========================================
app.get('/api/city/info', requireAuth, (req, res) => {
    const user = db.users.find(u => u.id === req.userId);
    if (user.cityData) {
        if (!user.cityData.vehicles) user.cityData.vehicles = ['sedan_1'];
        if (typeof user.cityData.tutorialComplete === 'undefined') user.cityData.tutorialComplete = false;
    }
    res.json({
        cityData: user.cityData,
        plots: db.cityPlots || [],
        sculptCityWorld: db.systemState?.sculptCityWorld || null
    });
});

app.get('/api/city/world', requireAuth, (req, res) => {
    res.json({ sculptCityWorld: db.systemState?.sculptCityWorld || null });
});

app.post('/api/city/world/publish', requireAuth, (req, res) => {
    const user = db.users.find(u => u.id === req.userId);
    if (!isSculptCityAccount(user)) return res.status(403).json({ error: 'Only the Sculpt City account can publish this world.' });
    const safeGameData = sanitizeGameData(req.body?.gameData || {});
    if (!safeGameData?.spawn) return res.status(400).json({ error: 'Spawn is required for Sculpt City world publishing.' });
    if (!db.systemState) db.systemState = { restartUntil: 0, restartMessage: '' };
    db.systemState.sculptCityWorld = {
        gameData: safeGameData,
        updatedAt: Date.now(),
        updatedBy: user.username
    };
    saveDB();
    res.json({ success: true, sculptCityWorld: db.systemState.sculptCityWorld });
});

app.post('/api/city/claim', requireAuth, (req, res) => {
    const { neighborhood, plotX, plotZ } = req.body;
    const user = db.users.find(u => u.id === req.userId);
    
    if (user.cityData) return res.status(400).json({ error: 'You already claimed a plot!' });
    if (!db.cityPlots) db.cityPlots = [];
    
    const isTaken = db.cityPlots.find(p => p.plotX === plotX && p.plotZ === plotZ && p.neighborhood === neighborhood);
    if (isTaken) return res.status(400).json({ error: 'Plot is already taken!' });

    // Initialize the player with a Starter House and a Sedan.
    user.cityData = { neighborhood, plotX, plotZ, houseType: 'Starter', tutorialComplete: false, vehicles: ['sedan_1'] };
    db.cityPlots.push({
        id: crypto.randomUUID(), userId: user.id, username: user.username,
        neighborhood, plotX, plotZ, houseType: 'Starter'
    });

    saveDB();
    res.json({ success: true, cityData: user.cityData });
});

// NEW: Economy Sync (Rewards & Vehicle Purchases)
// NEW: Economy Sync (Rewards & Vehicle Purchases)
app.post('/api/city/sync', requireAuth, (req, res) => {
    const user = db.users.find(u => u.id === req.userId);
    
    // Grant Coins
    if (req.body.coinsToAdd) user.coins = (user.coins || 0) + req.body.coinsToAdd;
    
    // Process Vehicle Purchases
    if (user.cityData && req.body.vehicleToBuy) {
        if (!user.cityData.vehicles) user.cityData.vehicles = ['sedan_1'];
        if (user.coins >= req.body.cost) {
            user.coins -= req.body.cost;
            user.cityData.vehicles.push(req.body.vehicleToBuy);
        } else {
            return res.status(400).json({error: 'Not enough Sculpt Coins!'});
        }
    }
    if (user.cityData && req.body.tutorialComplete === true) {
        user.cityData.tutorialComplete = true;
    }
    ensureChallengeProgressDay(user);
    if (user.challengeProgress.cityVisits < 1) user.challengeProgress.cityVisits += 1;
    
    saveDB();
    res.json({ coins: user.coins, cityData: user.cityData });
});

app.post('/api/games/:id/play', requireAuth, (req, res) => {
    const user = db.users.find(u => u.id === req.userId);
    const gameId = req.params.id;
    const game = db.games.find(g => g.id === gameId);
    
    if (game) {
        game.plays = (game.plays || 0) + 1;
        if (game.groupId) {
            const group = db.groups.find(gr => gr.id === game.groupId);
            if (group) { group.coins = (group.coins || 0) + 1; addGroupXp(group, 4); }
        }
    }
    ensureChallengeProgressDay(user);
    user.challengeProgress.gamesPlayed += 1;

    // PLAY STREAK MATH
    let streakReward = 0;
    const todayStr = new Date().toDateString();
    const lastPlayStr = user.lastPlayDate ? new Date(user.lastPlayDate).toDateString() : '';
    
    if (todayStr !== lastPlayStr) {
        const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
        if (lastPlayStr === yesterday.toDateString()) user.playStreak += 1;
        else user.playStreak = 1;
        
        user.lastPlayDate = Date.now();
        if (user.playStreak > 0 && user.playStreak % 3 === 0) streakReward = 6;
    }
    let basePlayCoins = 2;
    if (game && (game.authorId === req.userId)) basePlayCoins = 1;
    if (game && game.groupId) {
        const group = db.groups.find(gr => gr.id === game.groupId);
        if (group && group.members.some(m => m.userId === req.userId)) basePlayCoins = 1;
    }
    user.coins += basePlayCoins + streakReward;
    user.recentlyPlayed = user.recentlyPlayed.filter(g => g.gameId !== gameId);
    user.recentlyPlayed.unshift({ gameId, timestamp: Date.now() });
    if (user.recentlyPlayed.length > 8) user.recentlyPlayed.pop();

    awardBadge(req.userId, 'Gamer');
    saveDB();
    res.json({ success: true, coins: user.coins, streakReward, playStreak: user.playStreak, basePlayCoins });
});
app.post('/api/games/:id/like', requireAuth, (req, res) => {
    const game = db.games.find(g => g.id === req.params.id);
    if (!game) return res.status(404).json({ error: 'Game not found.' });

    let isLiked = false;
    if (game.likes.includes(req.userId)) {
        game.likes = game.likes.filter(id => id !== req.userId);
    } else {
        game.likes.push(req.userId);
        isLiked = true;
        const user = db.users.find(u => u.id === req.userId);
        if (user) {
            ensureChallengeProgressDay(user);
            user.challengeProgress.likesGiven += 1;
        }
        awardBadge(req.userId, 'Critic');
    }
    saveDB();
    res.json({ likesCount: game.likes.length, isLiked });
});

app.post('/api/games/:id/bookmark', requireAuth, (req, res) => {
    const user = db.users.find(u => u.id === req.userId);
    const gameId = req.params.id;
    if (!db.games.find(g => g.id === gameId)) return res.status(404).json({ error: 'Game not found.' });

    if (!user.bookmarks) user.bookmarks = [];

    let isBookmarked = false;
    if (user.bookmarks.includes(gameId)) {
        user.bookmarks = user.bookmarks.filter(id => id !== gameId);
    } else {
        user.bookmarks.push(gameId);
        isBookmarked = true;
    }
    saveDB();
    res.json({ isBookmarked });
});

app.post('/api/games/:id/collaborators', requireAuth, (req, res) => {
    const game = db.games.find(g => g.id === req.params.id);
    if (!game) return res.status(404).json({ error: 'Game not found.' });
    if (game.authorId !== req.userId) return res.status(403).json({ error: 'Only creator can add collaborators.' });

    const { username } = req.body;
    const colUser = db.users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!colUser) return res.status(404).json({ error: 'User not found.' });
    if (colUser.id === req.userId) return res.status(400).json({ error: 'You already own this game.' });

    if (!game.collaborators.includes(colUser.id)) {
        game.collaborators.push(colUser.id);
        saveDB();
    }
    res.json({ message: `${colUser.username} added as a collaborator!` });
});

app.post('/api/games/:id/sync', requireAuth, (req, res) => {
    try {
        const game = db.games.find(g => g.id === req.params.id);
        if (!game) return res.status(404).json({ error: 'Game not found.' });
        
        let canEdit = game.authorId === req.userId || game.collaborators.includes(req.userId);
        if (game.groupId) {
            const group = db.groups.find(gr => gr.id === game.groupId);
            const perms = getGroupMemberPerms(group, req.userId);
            if (perms && perms.editGames) canEdit = true;
        }

        if (!canEdit) return res.status(403).json({ error: 'Not authorized.' });

        const { gameData, genre, lastLocalEditTime, cursor, baseServerEditTime } = req.body || {};
        if (!activeEditors[game.id]) activeEditors[game.id] = {};
        
        // Store their timestamp AND their 3D cursor position
        activeEditors[game.id][req.userId] = {
            timestamp: Date.now(),
            cursor: cursor || null
        };

        const activeUsernames = [];
        const activeEditorsData = []; // Holds the 3D data of other players
        
        for (let uId in activeEditors[game.id]) {
            if (Date.now() - activeEditors[game.id][uId].timestamp < 4000) {
                const u = db.users.find(usr => usr.id === uId);
                if (u) {
                    activeUsernames.push(u.username);
                    // Send cursor data to everyone EXCEPT the user requesting it
                    if (uId !== req.userId && activeEditors[game.id][uId].cursor) {
                        activeEditorsData.push({ username: u.username, cursor: activeEditors[game.id][uId].cursor });
                    }
                }
            } else delete activeEditors[game.id][uId];
        }

        let appliedUpdate = false;
        const hasMatchingBase = Number.isFinite(baseServerEditTime) && Number(baseServerEditTime) === Number(game.lastEditTime);
        if (gameData && hasMatchingBase && Number.isFinite(lastLocalEditTime) && lastLocalEditTime > game.lastEditTime) {
            const incomingData = sanitizeGameData(gameData);
            const existingData = sanitizeGameData(game.gameData || {});
            const existingById = new Map((existingData.objects || []).map(o => [o.id, o]));
            const incomingById = new Map((incomingData.objects || []).map(o => [o.id, o]));
            const mergedObjects = [];
            if (!deletedObjectTombstones[game.id]) deletedObjectTombstones[game.id] = {};
            const gameTombstones = deletedObjectTombstones[game.id];
            const now = Date.now();
            Object.keys(gameTombstones).forEach((objId) => {
                if (now - (gameTombstones[objId].deletedAt || 0) > 120000) delete gameTombstones[objId];
            });

            existingById.forEach((oldObj, id) => {
                const ownerId = oldObj.ownerId || game.authorId;
                const incomingObj = incomingById.get(id);
                if (!incomingObj) {
                    if (ownerId !== req.userId) mergedObjects.push({ ...oldObj, ownerId });
                    else gameTombstones[id] = { ownerId, deletedAt: now };
                    return;
                }
                if (ownerId !== req.userId) mergedObjects.push({ ...oldObj, ownerId });
                else mergedObjects.push({ ...incomingObj, ownerId });
                if (gameTombstones[id]) delete gameTombstones[id];
                incomingById.delete(id);
            });
            incomingById.forEach((newObj) => {
                const tombstone = gameTombstones[newObj.id];
                if (tombstone && tombstone.ownerId !== req.userId) return;
                mergedObjects.push({ ...newObj, ownerId: req.userId });
                if (gameTombstones[newObj.id]) delete gameTombstones[newObj.id];
            });

            if (req.userId !== game.authorId) {
                incomingData.settings = existingData.settings || incomingData.settings;
                incomingData.spawn = existingData.spawn || incomingData.spawn;
            }
            incomingData.objects = mergedObjects;
            game.gameData = incomingData;
            if (genre) game.genre = genre;
            game.lastEditTime = lastLocalEditTime;
            saveDB(); appliedUpdate = true;
        }

        // Return the new activeEditorsData array
        res.json({
            gameData: game.gameData,
            genre: game.genre,
            lastEditTime: game.lastEditTime,
            activeEditors: activeUsernames,
            activeEditorsData,
            acceptedLocalUpdate: appliedUpdate,
            rejectedReason: appliedUpdate ? null : (!hasMatchingBase ? 'stale_base' : 'older_edit')
        });
    } catch (error) {
        console.error('Team sync error:', error);
        res.status(500).json({ error: 'Team sync temporarily unavailable. Please retry.' });
    }
});

app.post("/api/invite", requireAuth, (req, res) => {
    const { friendId, gameId } = req.body;

    const sender = db.users.find(u => u.id === req.userId);
    const game = db.games.find(g => g.id === gameId);
    const target = db.users.find(u => u.id === friendId);

    if (!sender) return res.status(400).json({ error: "Sender not found" });
    if (!game) return res.status(400).json({ error: "Game not found" });
    if (!target) return res.status(400).json({ error: "Friend not found" });

    const key = `${sender.id}_${friendId}`;
    const now = Date.now();

    // ⏱️ 3 minute cooldown (180000 ms)
    if (inviteCooldowns[key] && now - inviteCooldowns[key] < 180000) {
        const remaining = Math.ceil((180000 - (now - inviteCooldowns[key])) / 1000);
        return res.status(429).json({
            error: `You can invite this player again in ${remaining}s`
        });
    }

    // ✅ save cooldown
    inviteCooldowns[key] = now;

    // ✅ create notification
    createNotification(friendId, "invite", {
        from: sender.username,
        fromId: sender.id,
        gameId: game.id,
        gameName: game.title || "Unknown Game"
    });

    res.json({ success: true });
});

// ==========================================
// PLAYSCULPT LIVE
// ==========================================
const LIVE_USERNAME_RE = /^[A-Za-z0-9._]{1,20}$/;
const cleanupLiveViewers = () => {
    const now = Date.now();
    Object.values(liveStreams).forEach((s) => {
        if (!s || !s.activeViewers) return;
        Object.keys(s.activeViewers).forEach((uid) => {
            if ((s.activeViewers[uid] || 0) < now - 15000) delete s.activeViewers[uid];
        });
    });
};
const getLiveAccountByUserId = (userId) => (db.live?.accounts || []).find(a => a.userId === userId) || null;
const getLiveStats = (userId) => {
    if (!db.live.channelStats) db.live.channelStats = {};
    if (!db.live.channelStats[userId]) db.live.channelStats[userId] = { likesTotal: 0, viewsTotal: 0, tipsTotal: 0, earningsCoins: 0 };
    return db.live.channelStats[userId];
};

app.get('/api/live/status', requireAuth, (req, res) => {
    cleanupLiveViewers();
    const account = getLiveAccountByUserId(req.userId);
    const stream = Object.values(liveStreams).find(s => s.ownerId === req.userId && s.active);
    res.json({
        account,
        stream: stream ? { id: stream.id, startedAt: stream.startedAt, viewerCount: Object.keys(stream.activeViewers || {}).length, likes: (stream.likes || []).length } : null,
        stats: getLiveStats(req.userId)
    });
});

app.post('/api/live/account', requireAuth, (req, res) => {
    const user = db.users.find(u => u.id === req.userId);
    const username = String(req.body.username || '').trim();
    const agreed = !!req.body.agreed;
    if (!agreed) return res.status(400).json({ error: 'You must agree to Playsculpt Live rules.' });
    if (!LIVE_USERNAME_RE.test(username)) return res.status(400).json({ error: 'Username must be 1-20 chars using letters, numbers, underscores, periods.' });
    if (getLiveAccountByUserId(user.id)) return res.status(400).json({ error: 'You already have a Playsculpt Live account.' });
    if ((db.live.accounts || []).some(a => String(a.username || '').toLowerCase() === username.toLowerCase())) return res.status(400).json({ error: 'Live username already taken.' });
    const acc = { id: crypto.randomUUID(), userId: user.id, mainUsername: user.username, username, createdAt: Date.now(), description: '', subscribers: [], logo: '', logoStatus: 'none', pendingLogo: '' };
    db.live.accounts.push(acc);
    if (!db.live.channelStats[user.id]) db.live.channelStats[user.id] = { likesTotal: 0, viewsTotal: 0, tipsTotal: 0, earningsCoins: 0 };
    saveDB();
    res.json({ success: true, account: acc });
});

app.get('/api/live/streams', requireAuth, (req, res) => {
    cleanupLiveViewers();
    const streams = Object.values(liveStreams).filter(s => s.active).map(s => ({
        id: s.id,
        ownerId: s.ownerId,
        liveUsername: s.liveUsername,
        viewerCount: Object.keys(s.activeViewers || {}).length,
        likes: (s.likes || []).length,
        startedAt: s.startedAt
    })).sort((a, b) => b.startedAt - a.startedAt);
    res.json({ streams });
});

app.post('/api/live/go-live', requireAuth, (req, res) => {
    const account = getLiveAccountByUserId(req.userId);
    if (!account) return res.status(403).json({ error: 'Create a Playsculpt Live account first.' });
    const existing = Object.values(liveStreams).find(s => s.ownerId === req.userId && s.active);
    if (existing) return res.json({ success: true, streamId: existing.id, startedAt: existing.startedAt });
    const streamId = crypto.randomUUID();
    liveStreams[streamId] = {
        id: streamId,
        ownerId: req.userId,
        liveUsername: account.username,
        startedAt: Date.now(),
        likes: [],
        likedBy: {},
        chat: [],
        tips: [],
        active: true,
        activeViewers: {},
        viewedUsers: {},
        watchMs: 0,
        watchCoinUnits: 0,
        signal: { forBroadcaster: [], forViewer: {} }
    };
    res.json({ success: true, streamId, startedAt: liveStreams[streamId].startedAt });
});

app.post('/api/live/stop', requireAuth, (req, res) => {
    const stream = Object.values(liveStreams).find(s => s.ownerId === req.userId && s.active);
    if (!stream) return res.json({ success: true });
    stream.active = false;
    const account = getLiveAccountByUserId(req.userId);
    if (account) account.lastLiveAt = Date.now();
    saveDB();
    res.json({ success: true });
});

app.post('/api/live/stream/:id/watch', requireAuth, (req, res) => {
    cleanupLiveViewers();
    const stream = liveStreams[req.params.id];
    if (!stream || !stream.active) return res.status(404).json({ error: 'Stream not found.' });
    if (req.body && req.body.leave) {
        delete stream.activeViewers[req.userId];
        return res.json({ success: true });
    }
    const now = Date.now();
    const prev = stream.activeViewers[req.userId] || 0;
    stream.activeViewers[req.userId] = now;
    if (prev > 0) {
        const delta = Math.max(0, Math.min(20000, now - prev));
        stream.watchMs = (stream.watchMs || 0) + delta;
        const units = Math.floor((stream.watchMs || 0) / 45000);
        if (units > (stream.watchCoinUnits || 0)) {
            const add = units - (stream.watchCoinUnits || 0);
            stream.watchCoinUnits = units;
            const owner = db.users.find(u => u.id === stream.ownerId);
            if (owner) owner.coins = (owner.coins || 0) + add;
            const stats = getLiveStats(stream.ownerId);
            stats.earningsCoins += add;
            saveDB();
        }
    }
    if (!stream.viewedUsers[req.userId]) {
        stream.viewedUsers[req.userId] = true;
        const stats = getLiveStats(stream.ownerId);
        stats.viewsTotal += 1;
        stats.earningsCoins += 1;
        saveDB();
    }
    res.json({ success: true, viewerCount: Object.keys(stream.activeViewers || {}).length });
});

app.get('/api/live/stream/:id', requireAuth, (req, res) => {
    cleanupLiveViewers();
    const stream = liveStreams[req.params.id];
    if (!stream || !stream.active) return res.status(404).json({ error: 'Stream not found.' });
    res.json({
        id: stream.id,
        liveUsername: stream.liveUsername,
        ownerUsername: db.users.find(u => u.id === stream.ownerId)?.username || '',
        likes: (stream.likes || []).length,
        viewerCount: Object.keys(stream.activeViewers || {}).length,
        recentTips: (stream.tips || []).slice(-8)
    });
});

app.get('/api/live/stream/:id/chat', requireAuth, (req, res) => {
    const stream = liveStreams[req.params.id];
    if (!stream || !stream.active) return res.status(404).json({ error: 'Stream not found.' });
    res.json({ messages: (stream.chat || []).slice(-120) });
});

app.post('/api/live/stream/:id/chat', requireAuth, (req, res) => {
    const stream = liveStreams[req.params.id];
    if (!stream || !stream.active) return res.status(404).json({ error: 'Stream not found.' });
    const user = db.users.find(u => u.id === req.userId);
    const text = String(req.body.text || '').trim().slice(0, 180);
    if (!text) return res.status(400).json({ error: 'Message required.' });
    stream.chat.push({ id: crypto.randomUUID(), authorId: user.id, authorName: user.username, text, timestamp: Date.now() });
    if (stream.chat.length > 200) stream.chat.shift();
    res.json({ success: true });
});

app.post('/api/live/stream/:id/like', requireAuth, (req, res) => {
    const stream = liveStreams[req.params.id];
    if (!stream || !stream.active) return res.status(404).json({ error: 'Stream not found.' });
    if (!stream.likedBy[req.userId]) {
        stream.likedBy[req.userId] = true;
        stream.likes.push(req.userId);
        const stats = getLiveStats(stream.ownerId);
        stats.likesTotal += 1;
        stats.earningsCoins += 2;
        saveDB();
    }
    res.json({ success: true, likes: stream.likes.length });
});

app.post('/api/live/stream/:id/tip', requireAuth, (req, res) => {
    const stream = liveStreams[req.params.id];
    if (!stream || !stream.active) return res.status(404).json({ error: 'Stream not found.' });
    const viewer = db.users.find(u => u.id === req.userId);
    const owner = db.users.find(u => u.id === stream.ownerId);
    if (!viewer || !owner) return res.status(404).json({ error: 'User not found.' });
    const amount = Math.max(1, parseInt(req.body.amount, 10) || 0);
    const message = String(req.body.message || '').slice(0, 150);
    if (amount <= 0) return res.status(400).json({ error: 'Invalid tip amount.' });
    if (viewer.coins < amount) return res.status(400).json({ error: 'Insufficient Sculpt Coins.' });
    viewer.coins -= amount;
    owner.coins = (owner.coins || 0) + amount;
    const tip = { id: crypto.randomUUID(), fromUserId: viewer.id, fromUsername: viewer.username, amount, message, timestamp: Date.now() };
    if (!Array.isArray(stream.tips)) stream.tips = [];
    stream.tips.push(tip);
    if (stream.tips.length > 100) stream.tips.shift();
    const stats = getLiveStats(owner.id);
    stats.tipsTotal += amount;
    stats.earningsCoins += amount;
    saveDB();
    res.json({ success: true, tip });
});

app.post('/api/live/channel/description', requireAuth, (req, res) => {
    const acc = getLiveAccountByUserId(req.userId);
    if (!acc) return res.status(404).json({ error: 'Live channel not found.' });
    acc.description = String(req.body.description || '').slice(0, 2000);
    saveDB();
    res.json({ success: true, description: acc.description });
});

app.post('/api/live/channel/logo', requireAuth, (req, res) => {
    const acc = getLiveAccountByUserId(req.userId);
    if (!acc) return res.status(404).json({ error: 'Live channel not found.' });
    const image = String(req.body.image || '').slice(0, 3000000);
    if (!image.startsWith('data:image/')) return res.status(400).json({ error: 'Logo must be an image.' });
    acc.pendingLogo = image;
    acc.logoStatus = 'pending';
    if (!Array.isArray(db.reports)) db.reports = [];
    db.reports.unshift({
        id: crypto.randomUUID(),
        reporterId: req.userId,
        reporterName: db.users.find(u => u.id === req.userId)?.username || req.userId,
        category: 'live_channel_logo',
        categoryLabel: 'Playsculpt Live Channel Logos',
        targetType: 'live_channel_logo',
        targetId: acc.id,
        targetName: acc.username,
        text: 'Please review this Playsculpt Live channel logo.',
        evidence: image.slice(0, 1000),
        status: 'pending',
        createdAt: Date.now()
    });
    saveDB();
    res.json({ success: true, message: 'Logo submitted for manual moderation approval.' });
});

app.get('/api/live/channel/:username', requireAuth, (req, res) => {
    const uname = String(req.params.username || '').toLowerCase();
    const acc = (db.live.accounts || []).find(a => String(a.username || '').toLowerCase() === uname || String(a.mainUsername || '').toLowerCase() === uname);
    if (!acc) return res.status(404).json({ error: 'Channel not found.' });
    const isSub = (acc.subscribers || []).includes(req.userId);
    res.json({
        username: acc.username,
        mainUsername: acc.mainUsername,
        description: acc.description || '',
        subscribersCount: (acc.subscribers || []).length,
        isSubscribed: isSub,
        lastLiveAt: acc.lastLiveAt || 0,
        logo: acc.logo || '',
        logoStatus: acc.logoStatus || 'none'
    });
});

app.post('/api/live/channel/:username/subscribe', requireAuth, (req, res) => {
    const uname = String(req.params.username || '').toLowerCase();
    const acc = (db.live.accounts || []).find(a => String(a.username || '').toLowerCase() === uname || String(a.mainUsername || '').toLowerCase() === uname);
    if (!acc) return res.status(404).json({ error: 'Channel not found.' });
    if (!Array.isArray(acc.subscribers)) acc.subscribers = [];
    const idx = acc.subscribers.indexOf(req.userId);
    let subscribed = false;
    if (idx >= 0) acc.subscribers.splice(idx, 1);
    else { acc.subscribers.push(req.userId); subscribed = true; }
    saveDB();
    res.json({ success: true, subscribed, subscribersCount: acc.subscribers.length });
});

app.post('/api/live/stream/:id/signal', requireAuth, (req, res) => {
    const stream = liveStreams[req.params.id];
    if (!stream || !stream.active) return res.status(404).json({ error: 'Stream not found.' });
    const role = String(req.body.role || '');
    if (role === 'viewer') {
        if (!stream.signal.forBroadcaster) stream.signal.forBroadcaster = [];
        stream.signal.forBroadcaster.push({ viewerId: req.userId, type: req.body.type, offer: req.body.offer || null, candidate: req.body.candidate || null });
        return res.json({ success: true });
    }
    if (role === 'broadcaster') {
        if (stream.ownerId !== req.userId) return res.status(403).json({ error: 'Only stream owner can send broadcaster signals.' });
        const viewerId = String(req.body.viewerId || '');
        if (!viewerId) return res.status(400).json({ error: 'viewerId required.' });
        if (!stream.signal.forViewer[viewerId]) stream.signal.forViewer[viewerId] = [];
        stream.signal.forViewer[viewerId].push({ type: req.body.type, answer: req.body.answer || null, candidate: req.body.candidate || null });
        return res.json({ success: true });
    }
    res.status(400).json({ error: 'Invalid role.' });
});

app.get('/api/live/stream/:id/signal/pull', requireAuth, (req, res) => {
    const stream = liveStreams[req.params.id];
    if (!stream || !stream.active) return res.status(404).json({ error: 'Stream not found.' });
    const role = String(req.query.role || '');
    if (role === 'broadcaster') {
        if (stream.ownerId !== req.userId) return res.status(403).json({ error: 'Only stream owner can pull broadcaster queue.' });
        const messages = stream.signal.forBroadcaster || [];
        stream.signal.forBroadcaster = [];
        return res.json({ messages });
    }
    if (role === 'viewer') {
        const key = req.userId;
        const messages = (stream.signal.forViewer && stream.signal.forViewer[key]) ? stream.signal.forViewer[key] : [];
        if (stream.signal.forViewer && stream.signal.forViewer[key]) stream.signal.forViewer[key] = [];
        return res.json({ messages });
    }
    res.status(400).json({ error: 'Invalid role.' });
});


// ==========================================
// GLOBAL CHAT & SPAM PROTECTION
// ==========================================
app.get('/api/chat', (req, res) => {
    res.json((db.globalChat || []).slice(-50)); // Return last 50 messages
});

app.post('/api/chat', requireAuth, (req, res) => {
    const user = db.users.find(u => u.id === req.userId);
    const text = (req.body.text || '').trim().substring(0, 150);
    if (!text) return res.status(400).json({error: 'Message cannot be empty.'});

    // 1. Account Age Check (30 minutes = 1,800,000 ms)
    const age = Date.now() - (user.createdAt || 0);
    if (age < 1800000) {
        const minsLeft = Math.ceil((1800000 - age) / 60000);
        return res.status(403).json({error: `Account must be 30 minutes old to chat. (${minsLeft} mins remaining)`});
    }

    // 2. Suspension Check
    if (chatSuspensions[req.userId] && Date.now() < chatSuspensions[req.userId]) {
        const secs = Math.ceil((chatSuspensions[req.userId] - Date.now()) / 1000);
        return res.status(403).json({error: `Chat suspended for spamming. Try again in ${secs}s.`});
    }

    // 3. Spam Detection (Max 3 messages in 5 seconds)
    if (!chatActivity[req.userId]) chatActivity[req.userId] = [];
    const now = Date.now();
    chatActivity[req.userId] = chatActivity[req.userId].filter(t => now - t < 5000);
    chatActivity[req.userId].push(now);

    if (chatActivity[req.userId].length > 3) { 
        chatSuspensions[req.userId] = now + 15000; // 15-second suspension
        return res.status(403).json({error: 'Spam detected. Chat suspended for 15 seconds.'});
    }

    if (!db.globalChat) db.globalChat = [];
    if (isLikelyDuplicateMessage(db.globalChat, req.userId, text, 1600)) {
        return res.json({ success: true, message: db.globalChat[db.globalChat.length - 1] || null });
    }
    const newMsg = { id: crypto.randomUUID(), authorName: user.username, text, timestamp: now };
    
    db.globalChat.push(newMsg);
    if (db.globalChat.length > 100) db.globalChat.shift(); // Keep memory clean
    appendChatLog({
        channel: 'global_chat',
        sourceType: 'global',
        sourceId: 'global',
        authorId: user.id,
        authorName: user.username,
        text,
        timestamp: now
    });
    saveDB();
    
    res.json({ success: true, message: newMsg });
});


// ==========================================
// GAME SERVER CHAT
// ==========================================
app.get('/api/games/:id/chat', requireAuth, (req, res) => {
    const gameId = req.params.id;
    cleanupGameServerIfInactive(gameId);
    res.json({ messages: (gameChats[gameId] || []).slice(-50) });
});

app.post('/api/games/:id/chat', requireAuth, (req, res) => {
    const gameId = req.params.id;
    const user = db.users.find(u => u.id === req.userId);
    const text = String(req.body.text || '').trim().substring(0, 150);

    if (!text) {
        return res.status(400).json({ error: 'Message cannot be empty.' });
    }

    const key = `${gameId}_${req.userId}`;
    const now = Date.now();

    if (gameChatSuspensions[key] && now < gameChatSuspensions[key]) {
        const secs = Math.ceil((gameChatSuspensions[key] - now) / 1000);
        return res.status(403).json({ error: `You must wait ${secs} more second(s) before chatting again.` });
    }

    if (!gameChatActivity[key]) gameChatActivity[key] = [];
    gameChatActivity[key] = gameChatActivity[key].filter(t => now - t < 5000);
    gameChatActivity[key].push(now);

    // More than 4 messages in 5 seconds = 12 second cooldown
    if (gameChatActivity[key].length > 4) {
        gameChatSuspensions[key] = now + 12000;
        const secs = Math.ceil((gameChatSuspensions[key] - now) / 1000);
        return res.status(403).json({ error: `You are chatting too fast. Wait ${secs} second(s).` });
    }

    if (!gameChats[gameId]) gameChats[gameId] = [];
    cleanupGameServerIfInactive(gameId);
    if (!gameChats[gameId]) gameChats[gameId] = [];
    if (isLikelyDuplicateMessage(gameChats[gameId], req.userId, text, 1500)) {
        return res.json({ success: true, message: gameChats[gameId][gameChats[gameId].length - 1] || null });
    }

    const activePlayer = activePlayers[gameId] && activePlayers[gameId][req.userId];

    const newMsg = {
        id: crypto.randomUUID(),
        userId: req.userId,
        username: user ? user.username : 'Unknown',
        text,
        timestamp: now,
        sceneId: activePlayer ? activePlayer.sceneId : null,
        position: activePlayer ? {
            x: activePlayer.x,
            y: activePlayer.y,
            z: activePlayer.z
        } : null
    };

    gameChats[gameId].push(newMsg);
    if (gameChats[gameId].length > 100) gameChats[gameId].shift();
    touchGameServer(gameId);
    appendChatLog({
        channel: 'game_chat',
        sourceType: 'game',
        sourceId: gameId,
        gameId,
        authorId: req.userId,
        authorName: newMsg.username,
        text,
        timestamp: now,
        meta: { sceneId: newMsg.sceneId }
    });
    saveDB();

    res.json({ success: true, message: newMsg });
});

app.post('/api/games/:id/play-sync', requireAuth, (req, res) => {
    const gameId = req.params.id;
    const { x, y, z, rotY, sceneId, color, bodyColors, isDead, deadAt, dynamicStates } = req.body;
    const user = db.users.find(u => u.id === req.userId);

if (!activePlayers[gameId]) activePlayers[gameId] = {};
touchGameServer(gameId);

const lastChatMessage = (gameChats[gameId] || [])
    .slice()
    .reverse()
    .find(m => m.userId === req.userId && (Date.now() - m.timestamp) < 7000);

const shirtItem = (db.clothingItems || []).find(i => i.id === user.equippedShirt);
const pantsItem = (db.clothingItems || []).find(i => i.id === user.equippedPants);

activePlayers[gameId][req.userId] = { 
    x, y, z, rotY, sceneId, username: user.username, 
    color: color || user.color || '#e74c3c', 
    equipped: user.equipped,
    bodyColors: bodyColors || null,
    isDead: !!isDead,
    deadAt: deadAt || null,
    equippedShirtImage: shirtItem ? shirtItem.designImage : null,
    equippedPantsImage: pantsItem ? pantsItem.designImage : null,
    timestamp: Date.now(),
    activeChatBubble: lastChatMessage ? {
        text: lastChatMessage.text,
        timestamp: lastChatMessage.timestamp
    } : null
};
const trustAwarded = awardGameplayTrustIfEligible(user, { x, y, z, rotY });

if (Array.isArray(dynamicStates)) {
    activePlayDynamic[gameId] = {
        updatedAt: Date.now(),
        states: dynamicStates
            .slice(0, 48)
            .map(s => ({
                id: String(s.id || '').slice(0, 80),
                x: Number(s.x) || 0, y: Number(s.y) || 0, z: Number(s.z) || 0,
                qx: Number(s.qx) || 0, qy: Number(s.qy) || 0, qz: Number(s.qz) || 0, qw: Number(s.qw) || 1,
                vx: Number(s.vx) || 0, vy: Number(s.vy) || 0, vz: Number(s.vz) || 0
            }))
            .filter(s => s.id)
    };
}

const others = [];
for (let uId in activePlayers[gameId]) {
    // Check if their last ping was within 3 seconds
    if (Date.now() - activePlayers[gameId][uId].timestamp < 3000) {
        if (uId !== req.userId && activePlayers[gameId][uId].sceneId === sceneId) {
            others.push({ userId: uId, ...activePlayers[gameId][uId] });
            grantFriendshipXp(req.userId, uId, 5);
        }
    } else {
        // Remove timed-out player
        delete activePlayers[gameId][uId];
    }
}

// If nobody is left in this game server, wipe its temporary server chat too
if (!activePlayers[gameId] || Object.keys(activePlayers[gameId]).length === 0) clearGameServerState(gameId);

if (trustAwarded) saveDB();
const dynamicPayload = activePlayDynamic[gameId] && (Date.now() - activePlayDynamic[gameId].updatedAt < 3000)
    ? activePlayDynamic[gameId].states
    : [];

const trustMeta = normalizeUserTrust(user);
res.json({ players: others, dynamicStates: dynamicPayload, trustPoints: trustMeta.trustPoints, trustLevel: trustMeta.trustLevel, trustLevelName: trustMeta.trustLevelName });
});



app.get('/api/games/:id/server-players', requireAuth, (req, res) => {
    const gameId = req.params.id;
    const now = Date.now();

    if (!activePlayers[gameId]) {
        return res.json({ players: [] });
    }

    const players = [];

    for (const userId in activePlayers[gameId]) {
        const p = activePlayers[gameId][userId];

        if (!p || now - p.timestamp > 3000) {
            delete activePlayers[gameId][userId];
            continue;
        }

        players.push({
            userId,
            username: p.username || 'Unknown Player'
        });
    }

    players.sort((a, b) => a.username.localeCompare(b.username));

    res.json({ players });
});

app.get('/sitemap.xml', (req, res) => {
  res.sendFile(__dirname + '/sitemap.xml');
});

// ==========================================
// SEO PAGE ROUTING
// ==========================================
// Serve pre-rendered SEO pages (e.g., visiting /seo/games/123 serves public/seo/games/123.html)
app.get('/seo/*any', (req, res, next) => {
    // Strip '/seo' from the path to get the relative filename
    const relativePath = req.path.replace('/seo', '');
    let filePath = path.join(__dirname, 'public', 'seo', relativePath);

    // If the path doesn't end in .html, append it so the file system can find it
    if (!filePath.endsWith('.html')) {
        filePath += '.html';
    }

    // Serve the file if it exists; otherwise, pass the request to the SPA catch-all
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        next(); 
    }
});

// Your existing SPA catch-all
app.get('*any', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
setInterval(() => {
    Object.keys(gameServerLastSeen).forEach((gameId) => cleanupGameServerIfInactive(gameId, 15000));
}, 5000);
httpServer = app.listen(PORT, () => {
    console.log(`Playsculpt server running on http://localhost:${PORT}`);
});
