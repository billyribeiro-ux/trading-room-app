function Hxe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'emoji-mart', 20),
      x('emojiSelect', function (o) {
        return (D(e), E(g().selectEmoji(o)));
      }),
      u());
  }
}
function $xe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'span', 21),
      x('click', function () {
        return (D(e), E(g().imgUpload()));
      }),
      T(1, 'i', 22),
      u());
  }
}
const go = window.$;
let gc;
function A2(t) {
  (t.stopPropagation(),
    t.preventDefault(),
    (t.target.className = 'dragover' === t.type ? 'hover' : ''));
}
function zxe(t) {
  console.log('FileDropped:', t);
  const n = document.createElement('img'),
    e = new FileReader();
  ((e.onloadend = () => {
    ((n.src = e.result), go('#fileList').append(n));
  }),
    e.readAsDataURL(t));
}
function BB(t) {
  (go('#fileList').show(), go('#filedrag').hide(), A2(t));
  const n = t.target.files || t.dataTransfer.files;
  (go('#fileList').empty(), (gc = []));
  for (let i, e = 0; (i = n[e]); e++) (gc.push(i), zxe(i));
}
