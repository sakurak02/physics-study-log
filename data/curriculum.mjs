export const fields = [
  { slug: 'mechanics', name: '力学', en: 'Mechanics', description: '運動・力・エネルギー' },
  { slug: 'thermodynamics', name: '熱力学', en: 'Thermodynamics', description: '熱・温度・エネルギー' },
  { slug: 'waves', name: '波動', en: 'Waves', description: '波の性質・音・光' },
  { slug: 'atomic', name: '原子', en: 'Atomic Physics', description: '原子・電子・光' },
  { slug: 'electromagnetism', name: '電磁気', en: 'Electromagnetism', description: '電場・磁場・電磁波' }
];
const rows = [
  ['速度・加速度', '速度', '加速度'],
  ['等加速度運動', '等加速度運動の公式', '等加速度運動の解法'],
  ['落体の運動', '自由落下・鉛直投げ上げ運動'],
  ['力のつり合い', '力の書き方', '注意すべき4つの力'],
  ['運動方程式', '運動の三法則', '運動方程式の立て方'],
  ['運動方程式の応用', '等加速度運動の予言法'],
  ['仕事とエネルギー', '仕事', '力学的エネルギー'],
  ['仕事とエネルギーの関係', '仕事とエネルギーの関係'],
  ['放物運動', '放物運動'],
  ['力のモーメントのつり合い', '力のモーメント', '重心', '転倒条件'],
  ['力積と運動量', '力積と運動量', '力積と運動量の関係', '反発係数'],
  ['種々の衝突', 'バウンドのくり返しの規則性', '斜衝突のベクトル図法'],
  ['2つの保存則', 'いつどの保存則を使うのか'],
  ['慣性力', '慣性力', '見かけの重力'],
  ['円運動', '角速度・向心加速度', '遠心力'],
  ['万有引力', '万有引力と重力', '楕円軌道とケプラーの三法則'],
  ['単振動', '単振動と円運動', '単振動の「3つのデータ」'],
  ['単振動の応用', '合力で考えた見かけの水平ばね振り子'],
  ['熱と温度', '温度と比熱', '比熱の問題の解法'],
  ['気体の状態変化', '気体の状態方程式', 'P-Vグラフ'],
  ['気体分子運動論', '気体分子運動論'],
  ['熱力学', '内部エネルギー', '熱力学第一法則'],
  ['熱力学の応用', '定積モル比熱と定圧モル比熱', '熱効率', '等温変化と断熱変化', '真空容器への膨張']
];
export const pad = n => String(n).padStart(2, '0');
let coreNumber = 0;
export const chapters = rows.map(([name, ...names], i) => {
  const number = i + 1;
  const field = fields[i < 18 ? 0 : 1];
  const url = `${field.slug}/chapter-${pad(number)}/`;
  return { name, number, field, url, cores: names.map(name => ({ name, number: ++coreNumber, url: `${url}core-${pad(coreNumber)}/` })) };
});
