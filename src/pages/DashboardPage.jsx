import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import {
  TrendingUp, Heart, MessageCircle, Users, FileText,
  Zap, ArrowUp, ArrowDown, Minus
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 14, padding: '18px 20px',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-muted)' }}>
          {label}
        </span>
        <div style={{
          width: 32, height: 32, borderRadius: 9,
          background: `${color}15`,
          border: `1px solid ${color}25`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={15} color={color} />
        </div>
      </div>
      <div>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 28,
          fontWeight: 700, color: color,
          display: 'block', lineHeight: 1,
        }}>
          {value ?? '—'}
        </span>
        {sub && (
          <span style={{
            fontFamily: 'var(--font-body)', fontSize: 11,
            color: 'var(--text-muted)', marginTop: 4, display: 'block',
          }}>
            {sub}
          </span>
        )}
      </div>
    </motion.div>
  )
}

// ── Top post row ──────────────────────────────────────────────────────────────
function TopPostRow({ post, rank }) {
  const text = post.content?.replace(/^\[.*?\]\s*/, '').trim() || ''
  const rankColors = ['#F59E0B', '#A3E635', '#22C55E']

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 14px',
      background: 'var(--surface-raised)',
      borderRadius: 10,
    }}>
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700,
        color: rankColors[rank] || 'var(--text-muted)',
        minWidth: 20, textAlign: 'center',
      }}>
        #{rank + 1}
      </span>
      <p style={{
        fontFamily: 'var(--font-body)', fontSize: 13,
        color: 'var(--text-secondary)', margin: 0, flex: 1,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {text || 'Post'}
      </p>
      <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontFamily: 'var(--font-mono)', fontSize: 11, color: '#EF4444' }}>
          <Heart size={11} fill="#EF4444" /> {post.like_count || 0}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontFamily: 'var(--font-mono)', fontSize: 11, color: '#22C55E' }}>
          <MessageCircle size={11} /> {post.comment_count || 0}
        </span>
      </div>
    </div>
  )
}

// ── Custom tooltip for charts ─────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 8, padding: '8px 12px',
      fontFamily: 'var(--font-body)', fontSize: 12,
      color: 'var(--text-secondary)',
      boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
    }}>
      <p style={{ margin: '0 0 4px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 10 }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ margin: 0, color: p.color, fontFamily: 'var(--font-mono)' }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user, profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats,   setStats]   = useState(null)
  const [chartData, setChartData] = useState([])
  const [topPosts,  setTopPosts]  = useState([])
  const [period,    setPeriod]    = useState('7d')  // '7d' | '30d'

  useEffect(() => {
    if (!user?.id) return
    loadDashboard()
  }, [user?.id, period]) // eslint-disable-line

  async function loadDashboard() {
    setLoading(true)
    const days = period === '7d' ? 7 : 30

    try {
      // ── All user posts ───────────────────────────────────────────────────
      const { data: posts } = await supabase
        .from('posts')
        .select('id, content, like_count, comment_count, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      const allPosts = posts || []

      // ── Total likes received ─────────────────────────────────────────────
      const totalLikes    = allPosts.reduce((s, p) => s + (p.like_count || 0), 0)
      const totalComments = allPosts.reduce((s, p) => s + (p.comment_count || 0), 0)

      // ── Engagement rate ──────────────────────────────────────────────────
      const engagementRate = allPosts.length > 0
        ? (((totalLikes + totalComments) / allPosts.length) * 100).toFixed(1)
        : '0.0'

      // ── Top 3 posts ──────────────────────────────────────────────────────
      const top3 = [...allPosts]
        .sort((a, b) => ((b.like_count || 0) + (b.comment_count || 0)) - ((a.like_count || 0) + (a.comment_count || 0)))
        .slice(0, 3)

      setTopPosts(top3)
      setStats({
        totalPosts:      allPosts.length,
        totalLikes,
        totalComments,
        followers:       profile?.follower_count || 0,
        following:       profile?.following_count || 0,
        engagementRate,
      })

      // ── Activity chart — posts + likes per day ───────────────────────────
      const now = new Date()
      const chartDays = Array.from({ length: days }, (_, i) => {
        const d = new Date(now)
        d.setDate(d.getDate() - (days - 1 - i))
        return {
          date:     d.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
          dateKey:  d.toISOString().split('T')[0],
          posts:    0,
          likes:    0,
        }
      })

      // Count posts per day
      allPosts.forEach(post => {
        const key = post.created_at?.split('T')[0]
        const day = chartDays.find(d => d.dateKey === key)
        if (day) {
          day.posts  += 1
          day.likes  += post.like_count || 0
        }
      })

      setChartData(chartDays)
    } catch (err) {
      console.error('Dashboard load error:', err)
    } finally {
      setLoading(false)
    }
  }

  const name = profile?.full_name || profile?.username || 'builder'

  // ── Loading skeletons ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div>
        <div style={{ marginBottom: 24 }}>
          <div className="skeleton" style={{ width: 200, height: 24, borderRadius: 6, marginBottom: 8 }} />
          <div className="skeleton" style={{ width: 140, height: 14, borderRadius: 4 }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 20 }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 96, borderRadius: 14 }} />
          ))}
        </div>
        <div className="skeleton" style={{ height: 200, borderRadius: 14, marginBottom: 20 }} />
      </div>
    )
  }

  return (
    <div>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}
      >
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 22, color: 'var(--text-primary)', margin: '0 0 4px' }}>
            Dashboard
          </h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
            Your craft by the numbers, {name}.
          </p>
        </div>

        {/* Period selector */}
        <div style={{
          display: 'flex', gap: 4, padding: 4,
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
        }}>
          {[['7d', '7 days'], ['30d', '30 days']].map(([val, lbl]) => (
            <button
              key={val}
              onClick={() => setPeriod(val)}
              style={{
                padding: '6px 12px',
                background: period === val ? 'var(--primary)' : 'transparent',
                color: period === val ? '#0B0B0E' : 'var(--text-secondary)',
                border: 'none', borderRadius: 7, cursor: 'pointer',
                fontFamily: 'var(--font-heading)', fontSize: 11, fontWeight: 700,
                letterSpacing: '0.04em', transition: 'all 200ms',
              }}
            >
              {lbl}
            </button>
          ))}
        </div>
      </motion.div>

      {/* ── Stat cards — 2×2 grid ───────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 20 }}>
        <StatCard icon={FileText}      label="Total Posts"       value={stats?.totalPosts}      color="#F59E0B" sub="All time"         delay={0} />
        <StatCard icon={Heart}         label="Likes Received"    value={stats?.totalLikes}      color="#EF4444" sub="All time"         delay={0.06} />
        <StatCard icon={MessageCircle} label="Comments"          value={stats?.totalComments}   color="#22C55E" sub="On your posts"    delay={0.12} />
        <StatCard icon={Users}         label="Followers"         value={stats?.followers}       color="#A3E635" sub={`Following ${stats?.following || 0}`} delay={0.18} />
      </div>

      {/* Engagement rate banner */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.24 }}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px',
          background: 'linear-gradient(135deg, rgba(245,158,11,0.1) 0%, rgba(34,197,94,0.08) 100%)',
          border: '1px solid rgba(245,158,11,0.2)',
          borderRadius: 14, marginBottom: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Zap size={18} color="var(--primary)" />
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-secondary)' }}>
            Engagement rate
          </span>
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, color: 'var(--primary)' }}>
          {stats?.engagementRate}%
        </span>
      </motion.div>

      {/* ── Activity chart ──────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28 }}
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 14, padding: '20px 16px',
          marginBottom: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 14, color: 'var(--text-primary)', margin: 0 }}>
            Activity
          </h3>
          <div style={{ display: 'flex', gap: 16 }}>
            {[['Posts', '#F59E0B'], ['Likes', '#EF4444']].map(([lbl, col]) => (
              <span key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-muted)' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: col, display: 'inline-block' }} />
                {lbl}
              </span>
            ))}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gPosts" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#F59E0B" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gLikes" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#EF4444" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: 'var(--text-muted)' }}
              axisLine={false} tickLine={false}
              interval={period === '7d' ? 0 : 4}
            />
            <YAxis
              tick={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: 'var(--text-muted)' }}
              axisLine={false} tickLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="posts" name="Posts" stroke="#F59E0B" strokeWidth={2} fill="url(#gPosts)" dot={false} />
            <Area type="monotone" dataKey="likes" name="Likes" stroke="#EF4444" strokeWidth={2} fill="url(#gLikes)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>

      {/* ── Posts per type bar chart ─────────────────────────────────────── */}
      {chartData.some(d => d.posts > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.34 }}
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 14, padding: '20px 16px',
            marginBottom: 20,
          }}
        >
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 14, color: 'var(--text-primary)', margin: '0 0 16px' }}>
            Posts over time
          </h3>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: 'var(--text-muted)' }}
                axisLine={false} tickLine={false}
                interval={period === '7d' ? 0 : 4}
              />
              <YAxis
                tick={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: 'var(--text-muted)' }}
                axisLine={false} tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="posts" name="Posts" fill="#F59E0B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* ── Top 3 posts ─────────────────────────────────────────────────── */}
      {topPosts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.38 }}
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 14, padding: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <TrendingUp size={16} color="var(--primary)" />
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 14, color: 'var(--text-primary)', margin: 0 }}>
              Top performing posts
            </h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {topPosts.map((post, i) => (
              <TopPostRow key={post.id} post={post} rank={i} />
            ))}
          </div>
        </motion.div>
      )}

      {/* Empty state — no posts yet */}
      {stats?.totalPosts === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ textAlign: 'center', padding: '48px 24px' }}
        >
          <TrendingUp size={40} color="var(--text-muted)" style={{ marginBottom: 16 }} />
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 18, color: 'var(--text-primary)', margin: '0 0 8px' }}>
            Nothing to show yet
          </h3>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: 280, margin: '0 auto' }}>
            Start posting to see your engagement stats, activity charts, and top content here.
          </p>
        </motion.div>
      )}
    </div>
  )
}
