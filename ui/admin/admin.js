const boxes = document.querySelectorAll('.row input[type="checkbox"]');
const update = () => {
    const n = [...boxes].filter(b => b.checked).length;
    document.getElementById('selected').textContent = n;
    document.getElementById('bulk-count').textContent = n;
    document.getElementById('total').textContent = boxes.length;
};
boxes.forEach(b => b.addEventListener('change', update));
update();


const uisection = id => document.getElementById(id);
