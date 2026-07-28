import type { SlideMotionTween, SlideMotionVars } from '@/types/slides'

export type CameraMotionPresetCategoryId = 'cinematic' | 'social'
export type CameraMotionPresetTarget = '$stage' | '$background' | '$selected'
export type CameraMotionPresetIntensity = 'subtle' | 'medium' | 'strong'

export interface CameraMotionPresetFrame {
  offset: number
  target: CameraMotionPresetTarget
  step: Omit<SlideMotionTween, 'id' | 'elIds' | 'position'>
}

export interface CameraMotionPresetDefinition {
  id: string
  label: string
  labelEn: string
  categoryId: CameraMotionPresetCategoryId
  description: string
  color: string
  duration: number
  intensity: CameraMotionPresetIntensity
  tags: string[]
  frames: CameraMotionPresetFrame[]
}

const CINEMATIC = '#8b5cf6'
const SOCIAL = '#fb5f7e'

const to = (
  offset: number,
  target: CameraMotionPresetTarget,
  vars: SlideMotionVars
): CameraMotionPresetFrame => ({
  offset,
  target,
  step: { method: 'to', vars },
})

const from = (
  offset: number,
  target: CameraMotionPresetTarget,
  vars: SlideMotionVars
): CameraMotionPresetFrame => ({
  offset,
  target,
  step: { method: 'from', vars },
})

const fromTo = (
  offset: number,
  target: CameraMotionPresetTarget,
  fromVars: SlideMotionVars,
  toVars: SlideMotionVars
): CameraMotionPresetFrame => ({
  offset,
  target,
  step: { method: 'fromTo', fromVars, toVars },
})

const cinematic = (
  id: string,
  label: string,
  labelEn: string,
  description: string,
  duration: number,
  intensity: CameraMotionPresetIntensity,
  tags: string[],
  frames: CameraMotionPresetFrame[]
): CameraMotionPresetDefinition => ({
  id,
  label,
  labelEn,
  categoryId: 'cinematic',
  description,
  color: CINEMATIC,
  duration,
  intensity,
  tags,
  frames,
})

const social = (
  id: string,
  label: string,
  labelEn: string,
  description: string,
  duration: number,
  intensity: CameraMotionPresetIntensity,
  tags: string[],
  frames: CameraMotionPresetFrame[]
): CameraMotionPresetDefinition => ({
  id,
  label,
  labelEn,
  categoryId: 'social',
  description,
  color: SOCIAL,
  duration,
  intensity,
  tags,
  frames,
})

const CINEMATIC_PRESETS: CameraMotionPresetDefinition[] = [
  cinematic(
    'cinematic-slow-push',
    '缓慢推镜',
    'Slow Push In',
    '克制地靠近叙事核心，适合开场、观点建立与结论。',
    4.8,
    'subtle',
    ['推镜', '开场', '叙事'],
    [
      fromTo(0, '$stage',
        { scale: 0.97, y: 14, rotation: -0.25, transformOrigin: '50% 50%' },
        { scale: 1.06, y: -10, rotation: 0, duration: 4.8, ease: 'sine.inOut', force3D: true }
      ),
    ]
  ),
  cinematic(
    'cinematic-slow-pull',
    '缓慢拉远',
    'Slow Pull Out',
    '从细节逐渐退到完整画面，适合揭示关系或收束。',
    4.8,
    'subtle',
    ['拉镜', '揭示', '收尾'],
    [
      fromTo(0, '$stage',
        { scale: 1.12, x: -16, y: -12 },
        { scale: 0.98, x: 0, y: 0, duration: 4.8, ease: 'sine.inOut', force3D: true }
      ),
    ]
  ),
  cinematic(
    'cinematic-ken-burns-left',
    '肯·伯恩斯左移',
    'Ken Burns Left',
    '缓慢放大并向左重构图，适合图片、长段叙事与知识背景。',
    5.5,
    'subtle',
    ['平移', '缩放', '纪录片'],
    [
      fromTo(0, '$stage',
        { scale: 1.06, x: 70, y: 22 },
        { scale: 1.15, x: -72, y: -18, duration: 5.5, ease: 'none', force3D: true }
      ),
    ]
  ),
  cinematic(
    'cinematic-ken-burns-right',
    '肯·伯恩斯右移',
    'Ken Burns Right',
    '缓慢放大并向右重构图，适合图片、长段叙事与知识背景。',
    5.5,
    'subtle',
    ['平移', '缩放', '纪录片'],
    [
      fromTo(0, '$stage',
        { scale: 1.06, x: -70, y: 18 },
        { scale: 1.15, x: 72, y: -20, duration: 5.5, ease: 'none', force3D: true }
      ),
    ]
  ),
  cinematic(
    'cinematic-pan-left',
    '电影横移·向左',
    'Pan Left',
    '保持景别的稳定横移，适合横向公式、流程和对比。',
    3.8,
    'subtle',
    ['横移', '扫描', '流程'],
    [
      fromTo(0, '$stage',
        { scale: 1.08, x: 125 },
        { scale: 1.08, x: -125, duration: 3.8, ease: 'power1.inOut', force3D: true }
      ),
    ]
  ),
  cinematic(
    'cinematic-pan-right',
    '电影横移·向右',
    'Pan Right',
    '保持景别的稳定横移，适合横向公式、流程和对比。',
    3.8,
    'subtle',
    ['横移', '扫描', '流程'],
    [
      fromTo(0, '$stage',
        { scale: 1.08, x: -125 },
        { scale: 1.08, x: 125, duration: 3.8, ease: 'power1.inOut', force3D: true }
      ),
    ]
  ),
  cinematic(
    'cinematic-tilt-up',
    '仰拍上摇',
    'Tilt Up',
    '镜头由下至上检查画面，适合步骤、竖向结构和人物式构图。',
    3.6,
    'medium',
    ['上摇', '纵向', '揭示'],
    [
      fromTo(0, '$stage',
        { scale: 1.08, y: 145, rotationX: -2, transformPerspective: 1400 },
        { scale: 1.08, y: -115, rotationX: 1, duration: 3.6, ease: 'power2.inOut', force3D: true }
      ),
    ]
  ),
  cinematic(
    'cinematic-tilt-down',
    '俯拍下摇',
    'Tilt Down',
    '镜头由上至下检查画面，适合步骤、竖向结构和长图。',
    3.6,
    'medium',
    ['下摇', '纵向', '扫描'],
    [
      fromTo(0, '$stage',
        { scale: 1.08, y: -145, rotationX: 2, transformPerspective: 1400 },
        { scale: 1.08, y: 115, rotationX: -1, duration: 3.6, ease: 'power2.inOut', force3D: true }
      ),
    ]
  ),
  cinematic(
    'cinematic-crane-rise',
    '升降镜头·上升',
    'Crane Rise',
    '由低位上升并略微拉远，形成空间被打开的感觉。',
    3.2,
    'medium',
    ['升降', '空间', '转折'],
    [
      fromTo(0, '$stage',
        { scale: 1.13, y: 190, rotationX: -4, transformPerspective: 1200 },
        { scale: 1.01, y: -28, rotationX: 0, duration: 3.2, ease: 'power3.inOut', force3D: true }
      ),
    ]
  ),
  cinematic(
    'cinematic-crane-drop',
    '升降镜头·下降',
    'Crane Drop',
    '由高位下降并靠近主体，适合进入重点或落到结论。',
    3.2,
    'medium',
    ['升降', '落点', '重点'],
    [
      fromTo(0, '$stage',
        { scale: 0.96, y: -185, rotationX: 4, transformPerspective: 1200 },
        { scale: 1.08, y: 10, rotationX: 0, duration: 3.2, ease: 'power3.inOut', force3D: true }
      ),
    ]
  ),
  cinematic(
    'cinematic-arc-left',
    '弧形移动·向左',
    'Arc Move Left',
    '通过位移、旋转和缩放模拟小幅弧形轨迹。',
    3.4,
    'medium',
    ['弧线', '环绕', '空间'],
    [
      fromTo(0, '$stage',
        { scale: 1.09, x: 95, y: 52, rotation: 1.8 },
        { scale: 1.03, x: -45, y: -24, rotation: -0.4, duration: 3.4, ease: 'power2.inOut', force3D: true }
      ),
    ]
  ),
  cinematic(
    'cinematic-arc-right',
    '弧形移动·向右',
    'Arc Move Right',
    '通过位移、旋转和缩放模拟小幅弧形轨迹。',
    3.4,
    'medium',
    ['弧线', '环绕', '空间'],
    [
      fromTo(0, '$stage',
        { scale: 1.09, x: -95, y: 52, rotation: -1.8 },
        { scale: 1.03, x: 45, y: -24, rotation: 0.4, duration: 3.4, ease: 'power2.inOut', force3D: true }
      ),
    ]
  ),
  cinematic(
    'cinematic-orbit-left',
    '2.5D 环绕·向左',
    '2.5D Orbit Left',
    '用透视和 Y 轴旋转模拟镜头绕主体运动。',
    3.6,
    'medium',
    ['环绕', '2.5D', '透视'],
    [
      fromTo(0, '$stage',
        { scale: 1.08, x: 78, rotationY: 8, transformPerspective: 1400, transformOrigin: '50% 50%' },
        { scale: 1.04, x: -58, rotationY: -5, duration: 3.6, ease: 'power2.inOut', force3D: true }
      ),
    ]
  ),
  cinematic(
    'cinematic-orbit-right',
    '2.5D 环绕·向右',
    '2.5D Orbit Right',
    '用透视和 Y 轴旋转模拟镜头绕主体运动。',
    3.6,
    'medium',
    ['环绕', '2.5D', '透视'],
    [
      fromTo(0, '$stage',
        { scale: 1.08, x: -78, rotationY: -8, transformPerspective: 1400, transformOrigin: '50% 50%' },
        { scale: 1.04, x: 58, rotationY: 5, duration: 3.6, ease: 'power2.inOut', force3D: true }
      ),
    ]
  ),
  cinematic(
    'cinematic-dutch-in',
    '荷兰角进入',
    'Dutch Angle In',
    '镜头逐渐倾斜，制造不安、错误或失控感。',
    1.8,
    'medium',
    ['倾斜', '悬念', '失控'],
    [
      to(0, '$stage', { scale: 1.06, rotation: -3.5, x: -18, duration: 1.8, ease: 'power2.inOut', force3D: true }),
    ]
  ),
  cinematic(
    'cinematic-dutch-resolve',
    '荷兰角归正',
    'Dutch Angle Resolve',
    '从倾斜构图回归稳定，适合真相揭示和问题解决。',
    2.2,
    'medium',
    ['倾斜', '归正', '解决'],
    [
      fromTo(0, '$stage',
        { scale: 1.09, rotation: -4.5, x: -24 },
        { scale: 1, rotation: 0, x: 0, duration: 2.2, ease: 'power3.out', force3D: true }
      ),
    ]
  ),
  cinematic(
    'cinematic-rack-focus-near',
    '焦点转移·前景',
    'Rack Focus Near',
    '背景逐渐虚化，选中元素从模糊中成为视觉焦点。',
    2,
    'medium',
    ['焦点', '景深', '前景'],
    [
      fromTo(0, '$selected',
        { scale: 0.94, filter: 'blur(8px)', autoAlpha: 0.55 },
        { scale: 1.04, filter: 'blur(0px)', autoAlpha: 1, duration: 1.2, ease: 'power3.out', force3D: true }
      ),
      to(0.15, '$background', { scale: 1.04, filter: 'blur(4px)', duration: 1.45, ease: 'power2.inOut', force3D: true }),
    ]
  ),
  cinematic(
    'cinematic-rack-focus-far',
    '焦点转移·背景',
    'Rack Focus Far',
    '选中元素逐渐虚化，背景重新清晰，适合转移叙事层级。',
    2,
    'medium',
    ['焦点', '景深', '背景'],
    [
      to(0, '$selected', { scale: 1.03, filter: 'blur(6px)', autoAlpha: 0.62, duration: 1.1, ease: 'power2.inOut', force3D: true }),
      fromTo(0.12, '$background',
        { scale: 1.06, filter: 'blur(5px)' },
        { scale: 1, filter: 'blur(0px)', duration: 1.45, ease: 'power3.out', force3D: true }
      ),
    ]
  ),
  cinematic(
    'cinematic-dolly-zoom-in',
    '推轨变焦·压缩空间',
    'Dolly Zoom In',
    '舞台推近、主体反向缩小，模拟经典希区柯克变焦。',
    2.8,
    'strong',
    ['推轨变焦', '空间', '冲击'],
    [
      to(0, '$stage', { scale: 1.2, y: -18, duration: 2.8, ease: 'power2.inOut', force3D: true }),
      to(0, '$selected', { scale: 0.84, duration: 2.8, ease: 'power2.inOut', force3D: true }),
    ]
  ),
  cinematic(
    'cinematic-dolly-zoom-out',
    '推轨变焦·扩张空间',
    'Dolly Zoom Out',
    '舞台拉远、主体反向放大，模拟空间突然被拉开的感觉。',
    2.8,
    'strong',
    ['推轨变焦', '空间', '揭示'],
    [
      fromTo(0, '$stage',
        { scale: 1.16, y: -14 },
        { scale: 0.96, y: 8, duration: 2.8, ease: 'power2.inOut', force3D: true }
      ),
      fromTo(0, '$selected',
        { scale: 0.86 },
        { scale: 1.12, duration: 2.8, ease: 'power2.inOut', force3D: true }
      ),
    ]
  ),
  cinematic(
    'cinematic-parallax-left',
    '多层视差·向左',
    'Parallax Drift Left',
    '背景、舞台和选中元素以不同速度向左移动。',
    4.2,
    'medium',
    ['视差', '纵深', '多层'],
    [
      fromTo(0, '$background', { scale: 1.1, x: 58 }, { scale: 1.15, x: -58, duration: 4.2, ease: 'none', force3D: true }),
      fromTo(0, '$stage', { scale: 1.02, x: 24 }, { scale: 1.08, x: -24, duration: 4.2, ease: 'none', force3D: true }),
      fromTo(0, '$selected', { x: -20 }, { x: 28, duration: 4.2, ease: 'none', force3D: true }),
    ]
  ),
  cinematic(
    'cinematic-parallax-right',
    '多层视差·向右',
    'Parallax Drift Right',
    '背景、舞台和选中元素以不同速度向右移动。',
    4.2,
    'medium',
    ['视差', '纵深', '多层'],
    [
      fromTo(0, '$background', { scale: 1.1, x: -58 }, { scale: 1.15, x: 58, duration: 4.2, ease: 'none', force3D: true }),
      fromTo(0, '$stage', { scale: 1.02, x: -24 }, { scale: 1.08, x: 24, duration: 4.2, ease: 'none', force3D: true }),
      fromTo(0, '$selected', { x: 20 }, { x: -28, duration: 4.2, ease: 'none', force3D: true }),
    ]
  ),
  cinematic(
    'cinematic-follow-horizontal',
    '横向跟拍',
    'Horizontal Follow Cam',
    '镜头沿水平方向追踪信息流并最终回到全景。',
    4.4,
    'medium',
    ['跟拍', '流程', '横向'],
    [
      fromTo(0, '$stage', { scale: 1.1, x: 125 }, { scale: 1.1, x: -105, duration: 2.8, ease: 'power1.inOut', force3D: true }),
      to(2.8, '$stage', { scale: 1, x: 0, duration: 1.2, ease: 'power3.out', force3D: true }),
    ]
  ),
  cinematic(
    'cinematic-follow-vertical',
    '纵向跟拍',
    'Vertical Follow Cam',
    '镜头沿垂直方向追踪步骤并最终回到全景。',
    4.4,
    'medium',
    ['跟拍', '流程', '纵向'],
    [
      fromTo(0, '$stage', { scale: 1.1, y: 150 }, { scale: 1.1, y: -125, duration: 2.8, ease: 'power1.inOut', force3D: true }),
      to(2.8, '$stage', { scale: 1, y: 0, duration: 1.2, ease: 'power3.out', force3D: true }),
    ]
  ),
  cinematic(
    'cinematic-speed-ramp-push',
    '变速推镜',
    'Speed Ramp Push',
    '先缓慢靠近，再突然加速，最后柔和落定。',
    4.2,
    'medium',
    ['变速', '推镜', '节奏'],
    [
      to(0, '$stage', { scale: 1.025, y: -4, duration: 2.5, ease: 'sine.inOut', force3D: true }),
      to(2.5, '$stage', { scale: 1.12, y: -18, duration: 0.42, ease: 'power4.in', force3D: true }),
      to(2.92, '$stage', { scale: 1.065, y: -10, duration: 0.9, ease: 'power3.out', force3D: true }),
    ]
  ),
  cinematic(
    'cinematic-suspense-creep',
    '悬念潜入',
    'Suspense Creep',
    '极慢推近并轻微降低画面，制造等待答案的压力。',
    6,
    'subtle',
    ['悬念', '慢推', '压力'],
    [
      fromTo(0, '$stage',
        { scale: 1, y: 0, filter: 'brightness(1)' },
        { scale: 1.075, y: -22, filter: 'brightness(0.94)', duration: 6, ease: 'none', force3D: true }
      ),
    ]
  ),
  cinematic(
    'cinematic-hero-reveal',
    '英雄式揭示',
    'Hero Reveal',
    '从远、模糊、略带俯仰的镜头进入稳定主画面。',
    2.5,
    'strong',
    ['揭示', '英雄', '开场'],
    [
      fromTo(0, '$background',
        { scale: 1.16, filter: 'blur(10px)' },
        { scale: 1.03, filter: 'blur(0px)', duration: 2.2, ease: 'power3.out', force3D: true }
      ),
      fromTo(0.12, '$stage',
        { scale: 0.9, y: 70, rotationX: 5, filter: 'blur(8px)', transformPerspective: 1400 },
        { scale: 1, y: 0, rotationX: 0, filter: 'blur(0px)', duration: 2.3, ease: 'power4.out', force3D: true }
      ),
    ]
  ),
  cinematic(
    'cinematic-ending-pull-away',
    '结尾远离',
    'Ending Pull Away',
    '缓慢退场并降低画面存在感，适合总结和片尾。',
    4,
    'subtle',
    ['片尾', '拉远', '收束'],
    [
      to(0, '$stage', { scale: 0.9, y: 18, autoAlpha: 0.82, duration: 4, ease: 'sine.inOut', force3D: true }),
      to(0, '$background', { scale: 1, filter: 'brightness(0.88)', duration: 4, ease: 'sine.inOut', force3D: true }),
    ]
  ),
  cinematic(
    'cinematic-breathing-frame',
    '镜头呼吸',
    'Breathing Frame',
    '轻微推拉和上下漂移，保持长镜头的生命感。',
    3.8,
    'subtle',
    ['呼吸', '长镜头', '氛围'],
    [
      to(0, '$stage', { scale: 1.018, y: -7, rotation: 0.18, duration: 1.9, repeat: 1, yoyo: true, ease: 'sine.inOut', force3D: true }),
    ]
  ),
  cinematic(
    'cinematic-match-cut-reset',
    '匹配剪辑归位',
    'Match Cut Reset',
    '从近景、偏移和运动模糊快速归位，适合跨页视觉匹配。',
    0.9,
    'strong',
    ['匹配剪辑', '转场', '归位'],
    [
      fromTo(0, '$stage',
        { scale: 1.16, x: -70, y: 24, rotation: -1.8, filter: 'blur(10px)' },
        { scale: 1, x: 0, y: 0, rotation: 0, filter: 'blur(0px)', duration: 0.9, ease: 'power4.out', force3D: true }
      ),
    ]
  ),
  cinematic(
    'cinematic-macro-closeup',
    '微距特写',
    'Macro Close-up',
    '快速进入局部特写后保持缓慢推进，适合数字和关键词。',
    3.2,
    'strong',
    ['特写', '数字', '关键词'],
    [
      to(0, '$stage', { scale: 1.25, x: -55, y: -65, duration: 0.85, ease: 'power3.inOut', force3D: true }),
      to(0.85, '$stage', { scale: 1.31, x: -62, y: -72, duration: 2.1, ease: 'none', force3D: true }),
    ]
  ),
  cinematic(
    'cinematic-diagonal-drift',
    '对角线漂移',
    'Diagonal Drift',
    '沿对角线缓慢移动并略微旋转，适合抽象背景和氛围页。',
    4.6,
    'subtle',
    ['对角线', '漂移', '氛围'],
    [
      fromTo(0, '$stage',
        { scale: 1.07, x: 62, y: 55, rotation: 0.8 },
        { scale: 1.12, x: -58, y: -52, rotation: -0.6, duration: 4.6, ease: 'none', force3D: true }
      ),
    ]
  ),
]

const SOCIAL_PRESETS: CameraMotionPresetDefinition[] = [
  social(
    'social-punch-in',
    '爆点推近',
    'Punch Zoom In',
    '在关键词或包袱处快速推近并保留近景。',
    0.65,
    'strong',
    ['爆点', '推近', '短视频'],
    [
      to(0, '$stage', { scale: 1.14, y: -10, duration: 0.22, ease: 'power4.out', force3D: true }),
      to(0.22, '$stage', { scale: 1.075, y: -6, duration: 0.34, ease: 'back.out(2)', force3D: true }),
    ]
  ),
  social(
    'social-punch-out',
    '爆点拉远',
    'Punch Zoom Out',
    '突然拉远形成反差，再回到正常景别。',
    0.7,
    'strong',
    ['爆点', '拉远', '反差'],
    [
      to(0, '$stage', { scale: 0.86, duration: 0.2, ease: 'power4.out', force3D: true }),
      to(0.2, '$stage', { scale: 1, duration: 0.4, ease: 'back.out(1.8)', force3D: true }),
    ]
  ),
  social(
    'social-double-punch',
    '双连推近',
    'Double Punch',
    '连续两次短促推近，适合两段式强调。',
    1,
    'strong',
    ['双击', '节拍', '强调'],
    [
      to(0, '$stage', { scale: 1.1, duration: 0.16, ease: 'power4.out', force3D: true }),
      to(0.16, '$stage', { scale: 1.035, duration: 0.2, ease: 'power3.out', force3D: true }),
      to(0.48, '$stage', { scale: 1.15, duration: 0.16, ease: 'power4.out', force3D: true }),
      to(0.64, '$stage', { scale: 1.07, duration: 0.28, ease: 'back.out(2)', force3D: true }),
    ]
  ),
  social(
    'social-beat-pulse',
    '节拍缩放',
    'Beat Zoom Pulse',
    '按节拍短促缩放，适合数字、口播重音和列表。',
    1.4,
    'medium',
    ['节拍', '缩放', '口播'],
    [
      to(0, '$stage', { scale: 1.065, duration: 0.16, repeat: 3, yoyo: true, ease: 'power2.inOut', force3D: true }),
    ]
  ),
  social(
    'social-whip-left',
    '甩镜·向左',
    'Whip Pan Left',
    '从右侧高速甩入并带速度模糊和倾斜。',
    0.7,
    'strong',
    ['甩镜', '横移', '转场'],
    [
      fromTo(0, '$stage',
        { x: 230, skewX: 10, rotation: 1.8, filter: 'blur(14px)' },
        { x: -10, skewX: 0, rotation: 0, filter: 'blur(0px)', duration: 0.32, ease: 'power4.out', force3D: true }
      ),
      to(0.32, '$stage', { x: 0, duration: 0.22, ease: 'back.out(2.2)', force3D: true }),
    ]
  ),
  social(
    'social-whip-right',
    '甩镜·向右',
    'Whip Pan Right',
    '从左侧高速甩入并带速度模糊和倾斜。',
    0.7,
    'strong',
    ['甩镜', '横移', '转场'],
    [
      fromTo(0, '$stage',
        { x: -230, skewX: -10, rotation: -1.8, filter: 'blur(14px)' },
        { x: 10, skewX: 0, rotation: 0, filter: 'blur(0px)', duration: 0.32, ease: 'power4.out', force3D: true }
      ),
      to(0.32, '$stage', { x: 0, duration: 0.22, ease: 'back.out(2.2)', force3D: true }),
    ]
  ),
  social(
    'social-whip-up',
    '甩镜·向上',
    'Whip Tilt Up',
    '从下方高速甩入，适合竖向内容切换。',
    0.7,
    'strong',
    ['甩镜', '纵向', '转场'],
    [
      fromTo(0, '$stage',
        { y: 250, skewY: 5, filter: 'blur(14px)' },
        { y: -10, skewY: 0, filter: 'blur(0px)', duration: 0.34, ease: 'power4.out', force3D: true }
      ),
      to(0.34, '$stage', { y: 0, duration: 0.22, ease: 'back.out(2.2)', force3D: true }),
    ]
  ),
  social(
    'social-whip-down',
    '甩镜·向下',
    'Whip Tilt Down',
    '从上方高速甩入，适合竖向内容切换。',
    0.7,
    'strong',
    ['甩镜', '纵向', '转场'],
    [
      fromTo(0, '$stage',
        { y: -250, skewY: -5, filter: 'blur(14px)' },
        { y: 10, skewY: 0, filter: 'blur(0px)', duration: 0.34, ease: 'power4.out', force3D: true }
      ),
      to(0.34, '$stage', { y: 0, duration: 0.22, ease: 'back.out(2.2)', force3D: true }),
    ]
  ),
  social(
    'social-snap-left',
    '跳切重构图·左',
    'Snap Reframe Left',
    '快速把视觉中心切到左侧并硬朗停住。',
    0.5,
    'strong',
    ['跳切', '重构图', '左侧'],
    [
      to(0, '$stage', { scale: 1.13, x: -90, duration: 0.15, ease: 'power4.out', force3D: true }),
      to(0.15, '$stage', { scale: 1.1, x: -68, duration: 0.22, ease: 'power2.out', force3D: true }),
    ]
  ),
  social(
    'social-snap-right',
    '跳切重构图·右',
    'Snap Reframe Right',
    '快速把视觉中心切到右侧并硬朗停住。',
    0.5,
    'strong',
    ['跳切', '重构图', '右侧'],
    [
      to(0, '$stage', { scale: 1.13, x: 90, duration: 0.15, ease: 'power4.out', force3D: true }),
      to(0.15, '$stage', { scale: 1.1, x: 68, duration: 0.22, ease: 'power2.out', force3D: true }),
    ]
  ),
  social(
    'social-snap-closeup',
    '跳切近景',
    'Snap Close-up',
    '瞬间从全景切到近景，适合口播中的关键结论。',
    0.5,
    'strong',
    ['跳切', '近景', '结论'],
    [
      to(0, '$stage', { scale: 1.22, duration: 0.16, ease: 'power4.out', force3D: true }),
      to(0.16, '$stage', { scale: 1.15, duration: 0.24, ease: 'back.out(2)', force3D: true }),
    ]
  ),
  social(
    'social-snap-wide',
    '跳切全景',
    'Snap Wide',
    '瞬间从近景退出到全景，适合反转或补充上下文。',
    0.5,
    'strong',
    ['跳切', '全景', '反转'],
    [
      to(0, '$stage', { scale: 0.86, duration: 0.16, ease: 'power4.out', force3D: true }),
      to(0.16, '$stage', { scale: 0.95, duration: 0.24, ease: 'back.out(2)', force3D: true }),
    ]
  ),
  social(
    'social-impact-shake-x',
    '横向冲击抖动',
    'Horizontal Impact Shake',
    '短促横向震动，适合错误、碰撞和否定。',
    0.65,
    'strong',
    ['抖动', '冲击', '错误'],
    [
      to(0, '$stage', { x: -13, duration: 0.055, repeat: 5, yoyo: true, ease: 'none', force3D: true }),
      to(0.34, '$stage', { x: 0, duration: 0.12, ease: 'power3.out', force3D: true }),
    ]
  ),
  social(
    'social-impact-shake-y',
    '纵向冲击抖动',
    'Vertical Impact Shake',
    '短促纵向震动，适合落地、砸下和警示。',
    0.65,
    'strong',
    ['抖动', '冲击', '警示'],
    [
      to(0, '$stage', { y: -11, duration: 0.055, repeat: 5, yoyo: true, ease: 'none', force3D: true }),
      to(0.34, '$stage', { y: 0, duration: 0.12, ease: 'power3.out', force3D: true }),
    ]
  ),
  social(
    'social-impact-shake-rotation',
    '旋转冲击抖动',
    'Rotational Impact Shake',
    '小角度旋转震动，比位移抖动更有失控感。',
    0.7,
    'strong',
    ['抖动', '旋转', '失控'],
    [
      to(0, '$stage', { rotation: -1.8, scale: 1.03, duration: 0.06, repeat: 5, yoyo: true, ease: 'none', force3D: true }),
      to(0.37, '$stage', { rotation: 0, scale: 1, duration: 0.16, ease: 'power3.out', force3D: true }),
    ]
  ),
  social(
    'social-glitch-shake',
    '故障式抖动',
    'Glitch Shake',
    '位移、倾斜和高对比度组合，适合 AI 出错或数据异常。',
    0.85,
    'strong',
    ['故障', 'AI', '异常'],
    [
      to(0, '$stage', {
        x: -12,
        skewX: -2.5,
        filter: 'contrast(1.3) saturate(1.25)',
        duration: 0.055,
        repeat: 6,
        yoyo: true,
        ease: 'none',
        force3D: true,
      }),
      to(0.43, '$stage', { x: 0, skewX: 0, filter: 'contrast(1) saturate(1)', duration: 0.2, ease: 'power3.out', force3D: true }),
    ]
  ),
  social(
    'social-bounce-focus',
    '弹性聚焦',
    'Bounce Focus',
    '镜头弹到近景后回落，适合轻松语气和图标强调。',
    0.75,
    'medium',
    ['弹性', '聚焦', '轻松'],
    [
      to(0, '$stage', { scale: 1.16, y: -10, duration: 0.3, ease: 'back.out(2.5)', force3D: true }),
      to(0.3, '$stage', { scale: 1.07, y: -5, duration: 0.3, ease: 'power2.out', force3D: true }),
    ]
  ),
  social(
    'social-overshoot-zoom',
    '过冲变焦',
    'Overshoot Zoom',
    '从小景别冲过目标再回落，适合标题和章节切换。',
    0.8,
    'strong',
    ['过冲', '变焦', '标题'],
    [
      fromTo(0, '$stage',
        { scale: 0.72, filter: 'blur(8px)' },
        { scale: 1.17, filter: 'blur(0px)', duration: 0.34, ease: 'power4.out', force3D: true }
      ),
      to(0.34, '$stage', { scale: 1, duration: 0.32, ease: 'back.out(2)', force3D: true }),
    ]
  ),
  social(
    'social-elastic-reframe',
    '弹性重构图',
    'Elastic Reframe',
    '从偏移和倾斜状态弹回画面中心。',
    0.9,
    'medium',
    ['弹性', '重构图', '回正'],
    [
      fromTo(0, '$stage',
        { x: -120, y: 26, rotation: -3, scale: 0.9 },
        { x: 0, y: 0, rotation: 0, scale: 1, duration: 0.78, ease: 'elastic.out(1, 0.45)', force3D: true }
      ),
    ]
  ),
  social(
    'social-vertical-swipe-up',
    '竖屏滑切·向上',
    'Vertical Swipe Up',
    '模拟短视频信息流向上切换。',
    0.65,
    'strong',
    ['竖屏', '滑切', '信息流'],
    [
      fromTo(0, '$stage',
        { y: 260, scale: 0.94, filter: 'blur(10px)' },
        { y: 0, scale: 1, filter: 'blur(0px)', duration: 0.42, ease: 'power4.out', force3D: true }
      ),
    ]
  ),
  social(
    'social-vertical-swipe-down',
    '竖屏滑切·向下',
    'Vertical Swipe Down',
    '模拟短视频信息流向下切换。',
    0.65,
    'strong',
    ['竖屏', '滑切', '信息流'],
    [
      fromTo(0, '$stage',
        { y: -260, scale: 0.94, filter: 'blur(10px)' },
        { y: 0, scale: 1, filter: 'blur(0px)', duration: 0.42, ease: 'power4.out', force3D: true }
      ),
    ]
  ),
  social(
    'social-handheld-energy',
    '高能手持',
    'Energetic Handheld',
    '连续细碎位移和旋转，模拟高能口播手持镜头。',
    1.4,
    'strong',
    ['手持', '口播', '高能'],
    [
      to(0, '$stage', { x: -7, y: 4, rotation: -0.45, scale: 1.035, duration: 0.16, ease: 'sine.inOut', force3D: true }),
      to(0.16, '$stage', { x: 6, y: -5, rotation: 0.38, duration: 0.18, ease: 'sine.inOut', force3D: true }),
      to(0.34, '$stage', { x: -4, y: -2, rotation: -0.25, duration: 0.17, ease: 'sine.inOut', force3D: true }),
      to(0.51, '$stage', { x: 5, y: 4, rotation: 0.3, duration: 0.18, ease: 'sine.inOut', force3D: true }),
      to(0.69, '$stage', { x: 0, y: 0, rotation: 0, scale: 1.02, duration: 0.28, ease: 'power2.out', force3D: true }),
    ]
  ),
  social(
    'social-handheld-subtle',
    '轻微手持',
    'Subtle Handheld',
    '低幅度漂移，适合让静态口播画面保持自然。',
    3.2,
    'subtle',
    ['手持', '自然', '长口播'],
    [
      to(0, '$stage', { x: -3, y: 2, rotation: -0.12, scale: 1.015, duration: 0.8, ease: 'sine.inOut', force3D: true }),
      to(0.8, '$stage', { x: 3, y: -2, rotation: 0.1, duration: 0.8, ease: 'sine.inOut', force3D: true }),
      to(1.6, '$stage', { x: -2, y: -1, rotation: -0.08, duration: 0.8, ease: 'sine.inOut', force3D: true }),
      to(2.4, '$stage', { x: 0, y: 0, rotation: 0, duration: 0.7, ease: 'sine.inOut', force3D: true }),
    ]
  ),
  social(
    'social-reaction-tilt',
    '反应式歪头',
    'Reaction Tilt',
    '快速倾斜并回正，适合“等等”“不对”等反应。',
    0.7,
    'medium',
    ['反应', '倾斜', '口播'],
    [
      to(0, '$stage', { rotation: 3.5, x: 16, scale: 1.06, duration: 0.2, ease: 'power4.out', force3D: true }),
      to(0.2, '$stage', { rotation: 0, x: 0, scale: 1, duration: 0.36, ease: 'back.out(2.2)', force3D: true }),
    ]
  ),
  social(
    'social-caption-follow-x',
    '字幕跟拍·横向',
    'Caption Follow Horizontal',
    '镜头在左右信息之间快速跟随口播。',
    2.4,
    'medium',
    ['字幕', '跟拍', '横向'],
    [
      to(0, '$stage', { scale: 1.09, x: -70, duration: 0.38, ease: 'power3.inOut', force3D: true }),
      to(0.72, '$stage', { scale: 1.09, x: 70, duration: 0.55, ease: 'power3.inOut', force3D: true }),
      to(1.45, '$stage', { scale: 1, x: 0, duration: 0.5, ease: 'power3.out', force3D: true }),
    ]
  ),
  social(
    'social-caption-follow-y',
    '字幕跟拍·纵向',
    'Caption Follow Vertical',
    '镜头在上下步骤之间快速跟随口播。',
    2.4,
    'medium',
    ['字幕', '跟拍', '纵向'],
    [
      to(0, '$stage', { scale: 1.09, y: -85, duration: 0.38, ease: 'power3.inOut', force3D: true }),
      to(0.72, '$stage', { scale: 1.09, y: 85, duration: 0.55, ease: 'power3.inOut', force3D: true }),
      to(1.45, '$stage', { scale: 1, y: 0, duration: 0.5, ease: 'power3.out', force3D: true }),
    ]
  ),
  social(
    'social-freeze-punch',
    '定格强调',
    'Freeze Punch',
    '选中元素快速放大、短暂停留，再回到正常状态。',
    1.2,
    'strong',
    ['定格', '选中元素', '强调'],
    [
      to(0, '$selected', { scale: 1.22, rotation: -1.2, duration: 0.16, ease: 'power4.out', force3D: true }),
      to(0.16, '$selected', { scale: 1.22, rotation: -1.2, duration: 0.58, ease: 'none', force3D: true }),
      to(0.74, '$selected', { scale: 1, rotation: 0, duration: 0.34, ease: 'back.out(2)', force3D: true }),
      to(0, '$stage', { scale: 1.05, duration: 0.16, ease: 'power4.out', force3D: true }),
    ]
  ),
  social(
    'social-flash-cut',
    '闪白切入',
    'Flash Cut',
    '高亮、模糊和缩放瞬间复位，模拟快剪闪白。',
    0.55,
    'strong',
    ['闪白', '快剪', '转场'],
    [
      fromTo(0, '$stage',
        { scale: 1.12, autoAlpha: 0.18, filter: 'brightness(2.2) blur(8px)' },
        { scale: 1, autoAlpha: 1, filter: 'brightness(1) blur(0px)', duration: 0.26, ease: 'power4.out', force3D: true }
      ),
    ]
  ),
  social(
    'social-quick-dutch',
    '快速荷兰角',
    'Quick Dutch Angle',
    '突然倾斜再弹回，适合吐槽和错误警告。',
    0.65,
    'strong',
    ['倾斜', '吐槽', '警告'],
    [
      to(0, '$stage', { rotation: -4.5, x: -16, scale: 1.08, duration: 0.16, ease: 'power4.out', force3D: true }),
      to(0.16, '$stage', { rotation: 0, x: 0, scale: 1.02, duration: 0.34, ease: 'back.out(2.4)', force3D: true }),
    ]
  ),
  social(
    'social-feed-swipe',
    '信息流滑切',
    'Feed Swipe',
    '整页从下方滑入，同时选中元素稍后跟进。',
    0.9,
    'strong',
    ['信息流', '滑切', '层次'],
    [
      fromTo(0, '$stage',
        { y: 280, scale: 0.92, filter: 'blur(12px)' },
        { y: 0, scale: 1, filter: 'blur(0px)', duration: 0.46, ease: 'power4.out', force3D: true }
      ),
      from(0.16, '$selected', { y: 80, autoAlpha: 0, scale: 0.88, duration: 0.48, ease: 'back.out(1.8)', force3D: true }),
    ]
  ),
  social(
    'social-zoom-wobble',
    '变焦晃动',
    'Zoom Wobble',
    '放大同时轻微左右晃动，适合夸张反应。',
    0.9,
    'strong',
    ['变焦', '晃动', '夸张'],
    [
      to(0, '$stage', { scale: 1.14, x: -8, rotation: -0.8, duration: 0.18, ease: 'power4.out', force3D: true }),
      to(0.18, '$stage', { x: 8, rotation: 0.7, duration: 0.12, repeat: 2, yoyo: true, ease: 'none', force3D: true }),
      to(0.54, '$stage', { scale: 1.05, x: 0, rotation: 0, duration: 0.24, ease: 'power3.out', force3D: true }),
    ]
  ),
  social(
    'social-hard-stop-reframe',
    '急停重构图',
    'Hard-stop Reframe',
    '高速移动后瞬间停住，再做一次很小的回弹。',
    0.75,
    'strong',
    ['急停', '重构图', '速度'],
    [
      fromTo(0, '$stage',
        { x: -210, scale: 1.18, skewX: -8, filter: 'blur(12px)' },
        { x: 18, scale: 1.08, skewX: 0, filter: 'blur(0px)', duration: 0.28, ease: 'power4.out', force3D: true }
      ),
      to(0.28, '$stage', { x: 0, scale: 1.06, duration: 0.18, ease: 'back.out(3)', force3D: true }),
    ]
  ),
]

export const CAMERA_MOTION_PRESETS = [
  ...CINEMATIC_PRESETS,
  ...SOCIAL_PRESETS,
]

export const CAMERA_MOTION_PRESETS_BY_ID = new Map(
  CAMERA_MOTION_PRESETS.map(preset => [preset.id, preset])
)

export const CAMERA_MOTION_PRESET_CATEGORIES = [
  {
    id: 'cinematic' as const,
    label: '电影感运镜',
    labelEn: 'Cinematic Camera',
    description: '推拉摇移、视差、焦点转移、2.5D 环绕和叙事长镜头。',
    color: CINEMATIC,
    presets: CINEMATIC_PRESETS,
  },
  {
    id: 'social' as const,
    label: '自媒体感运镜',
    labelEn: 'Social Video Camera',
    description: '爆点推近、甩镜、跳切、抖动、字幕跟拍和竖屏滑切。',
    color: SOCIAL,
    presets: SOCIAL_PRESETS,
  },
]

if (CAMERA_MOTION_PRESETS.length !== 64) {
  throw new Error(`Camera motion preset catalog must contain 64 presets, got ${CAMERA_MOTION_PRESETS.length}`)
}
