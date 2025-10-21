        const firebaseConfig = {
            apiKey: "AIzaSyA1Rbp6QZVBYNGnFcAGFnexj8ajQxIC2Kg",
            authDomain: "menu-online-aps.firebaseapp.com",
            projectId: "menu-online-aps",
            storageBucket: "menu-online-aps.firebasestorage.app",
            messagingSenderId: "153926646130",
            appId: "1:153926646130:web:68d76914acee65dca4c5eb",
            measurementId: "G-SSJ1PQVP44"
        };
        import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
        // KODE BARU
        import { getFirestore, collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc, getDocs, serverTimestamp, query, where, orderBy, limit, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
        
        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);
        
        function escapeHTML(str) {
            if (!str) return '';
            return str.replace(/[&<>"']/g, function(match) {
                return {
                    '&': '&amp;',
                    '<': '&lt;',
                    '>': '&gt;',
                    '"': '&quot;',
                    "'": '&#39;'
                } [match];
            });
        }
        
        let allMenuItems = [];
        let activeOrders = [];
        let allTables = [];
        let cart = {};
        
        function initializeCart() {
            cart = {
                id: null,
                items: [],
                customerName: 'Umum',
                guestCount: 1,
                notes: '',
                isTakeAway: false,
                tableName: null,
                taxEnabled: true,
                discountType: 'percent',
                discountValue: 0,
                promo: null
            };
        }
        initializeCart();
        let tempCartItems = [];
        let selectedItemId = null;
        let activeOrderInterval;
        let lastSuccessfulOrder = null;
        let currentAreaMeja = 'Area utama';
        let currentMejaStatus = 'Meja Terisi';
        let sourceSplitItems = [];
        let destinationSplitItems = [];
        let selectedSourceIndex = null;
        let selectedDestinationIndex = null;
        let thCurrentDate = new Date();
        let thCurrentStatus = 'Semua status';
        let tempDate = new Date(); // Untuk datepicker
        let availablePromos = [];
        let selectedPromoId = null;
        let currentViewingOrder = null;
        let datepickerContext = 'transaksi';
        let totalDueForPayment = 0;
        let payments = [];
        let currentPaymentInput = '0';
        // ... setelah deklarasi 'currentPaymentInput'
        
        let editingItemId = null; // <-- Variabel baru untuk melacak item yang diedit
        
        // [BARU] Elemen-elemen DOM untuk modal Ubah Produk
        const editItemOverlay = document.getElementById('edit-item-overlay');
        const editItemImage = document.getElementById('edit-item-image');
        const editItemName = document.getElementById('edit-item-name');
        const editItemPrice = document.getElementById('edit-item-price');
        const editItemQuantity = document.getElementById('edit-item-quantity');
        const editItemDiscount = document.getElementById('edit-item-discount');
        const editItemNotes = document.getElementById('edit-item-notes');
        
        
        // ... setelah deklarasi 'editItemNotes'
        const editItemDiscountFixed = document.getElementById('edit-item-discount-fixed');
        const editItemDiscountPercent = document.getElementById('edit-item-discount-percent');
        const editItemDiskonSlider = document.getElementById('edit-item-diskon-slider');
        const editItemDiscountBtnFixed = document.getElementById('edit-item-discount-btn-fixed');
        const editItemDiscountBtnPercent = document.getElementById('edit-item-discount-btn-percent');
        
        
        // GANTI FUNGSI LAMA DENGAN VERSI BARU INI
        function openEditItemModal(itemId) {
            editingItemId = itemId;
            const item = cart.items.find(i => i.id === itemId);
            const menuItem = allMenuItems.find(mi => mi.id === itemId);
            
            if (!item) return;
            
            // Isi modal dengan data
            editItemName.textContent = item.name;
            editItemPrice.textContent = formatRupiah(item.price);
            editItemQuantity.value = item.quantity;
            editItemNotes.value = item.notes || '';
            if (menuItem && menuItem.image) {
                editItemImage.src = menuItem.image;
            } else {
                editItemImage.src = 'https://placehold.co/100x100/e2e8f0/64748b?text=Image';
            }
            
            // Atur toggle diskon berdasarkan data item
            if (item.discountType === 'percent') {
                editItemDiscountPercent.value = item.discountValue;
                editItemDiscountFixed.value = (item.price * item.quantity) * (item.discountValue / 100);
                editItemDiskonSlider.style.transform = 'translateX(100%)';
                editItemDiscountPercent.readOnly = false;
                editItemDiscountFixed.readOnly = true;
            } else { // 'fixed'
                editItemDiscountFixed.value = item.discountValue;
                editItemDiscountPercent.value = 0;
                editItemDiskonSlider.style.transform = 'translateX(0%)';
                editItemDiscountFixed.readOnly = false;
                editItemDiscountPercent.readOnly = true;
            }
            
            openModal(editItemOverlay);
        }
        
        // [BARU] Fungsi untuk menutup modal
        function closeEditItemModal() {
            editingItemId = null;
            closeModal(editItemOverlay);
        }
        
        // [BARU] Elemen DOM untuk filter Status
        
        const thStatusFilterBtn = document.getElementById('th-status-filter-btn');
        const thStatusOverlay = document.getElementById('th-status-overlay');
        const thStatusModal = document.getElementById('th-status-modal');
        const thStatusOptionsContainer = document.getElementById('th-status-options-container');
        const thStatusCloseBtn = document.getElementById('th-status-close-btn');
        
        // [BARU] Elemen DOM untuk filter Tanggal
        const thDatepickerOverlay = document.getElementById('th-datepicker-overlay');
        const thDatepickerModal = document.getElementById('th-datepicker-modal');
        const thDateDay = document.getElementById('th-date-day');
        const thDateMonth = document.getElementById('th-date-month');
        const thDateYear = document.getElementById('th-date-year');
        const thDatepickerCloseBtn = document.getElementById('th-datepicker-close-btn');
        const thDatepickerSelectBtn = document.getElementById('th-datepicker-select-btn');
        
        // --- DOM Elements ---
        // ...selector lain yang sudah ada...
        const bukaDapurBtn = document.getElementById('buka-dapur-btn');
        
        const dapurView = document.getElementById('dapur-view');
        const dapurBackBtn = document.getElementById('dapur-back-btn');
        const kolomBaru = document.getElementById('kolom-baru');
        const kolomDisiapkan = document.getElementById('kolom-disiapkan');
        const kolomDiantar = document.getElementById('kolom-diantar');
        const transaksiDetailView = document.getElementById('transaksi-detail-view');
        const tdCloseBtn = document.getElementById('td-close-btn');
        const tdShortId = document.getElementById('td-short-id');
        const tdFullId = document.getElementById('td-full-id');
        const tdStatus = document.getElementById('td-status');
        const tdReceiptContent = document.getElementById('td-receipt-content');
        const tdPrintBtn = document.getElementById('td-print-btn');
        const tdEmailBtn = document.getElementById('td-email-btn');
        const tdWhatsappBtn = document.getElementById('td-whatsapp-btn');
        const tdVoidBtn = document.getElementById('td-void-btn');
        const transaksiHarianView = document.getElementById('transaksi-harian-view');
        
        const transaksiHarianBackBtn = document.getElementById('transaksi-harian-back-btn');
        const transaksiHarianList = document.getElementById('transaksi-harian-list');
        const transaksiHarianCount = document.getElementById('transaksi-harian-count');
        const thDatepickerBtn = document.getElementById('th-datepicker-btn');
        const transaksiView = document.getElementById('transaksi-view');
        const transaksiBackBtn = document.getElementById('transaksi-back-btn');
        const dpDiskonSlider = document.getElementById('dp-diskon-slider');
        const dpDiskonBtnFixed = document.getElementById('dp-diskon-btn-fixed');
        const dpDiskonBtnPercent = document.getElementById('dp-diskon-btn-percent');
        const promoBtn = document.querySelector('button.flex-col.items-center:nth-of-type(3)'); // Tombol Promo di footer
        const promoOverlay = document.getElementById('promo-overlay');
        const promoModal = document.getElementById('promo-modal');
        const promoListContainer = document.getElementById('promo-list-container');
        const promoCloseBtn = document.getElementById('promo-close-btn');
        const promoSelectBtn = document.getElementById('promo-select-btn');
        const diskonPajakOverlay = document.getElementById('diskon-pajak-overlay');
        // Tambahkan variabel DOM-nya dulu
        const bukaTransaksiHarianBtn = document.getElementById('buka-transaksi-harian-btn');
        // [BARU] Event listener untuk klik pada daftar transaksi harian
        dapurView.addEventListener('click', async (e) => {
            const actionBtn = e.target.closest('button[data-id][data-next-status]');
            if (!actionBtn) return;
            
            const orderId = actionBtn.dataset.id;
            const nextStatus = actionBtn.dataset.nextStatus;
            
            actionBtn.textContent = 'Memproses...';
            actionBtn.disabled = true;
            
            try {
                const orderRef = doc(db, "onlineOrders", orderId);
                await updateDoc(orderRef, {
                    status: nextStatus
                });
                // onSnapshot akan otomatis memindahkan kartu ke kolom yang benar.
            } catch (error) {
                console.error("Gagal update status pesanan:", error);
                alert("Gagal memperbarui status pesanan.");
            }
        });
        transaksiHarianList.addEventListener('click', async (e) => {
            const item = e.target.closest('.th-item-clickable');
            if (!item) return;
            
            const orderId = item.dataset.id;
            if (!orderId) return;
            
            try {
                const docRef = doc(db, "orders", orderId);
                const docSnap = await getDoc(docRef);
                
                if (docSnap.exists()) {
                    const order = { id: docSnap.id, ...docSnap.data() };
                    currentViewingOrder = order;
                    document.getElementById('print-area').innerHTML = generateReceiptHTML(order); // Siapkan area print
                    
                    // Panggil fungsi untuk membuka halaman detail yang BARU
                    openTransaksiDetailView(order);
                    
                } else {
                    alert("Data nota tidak ditemukan.");
                }
            } catch (error) {
                console.error("Gagal mengambil detail nota:", error);
                alert("Terjadi kesalahan saat mengambil detail nota.");
            }
        });
        bukaTransaksiHarianBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openTransaksiHarianView();
        });
        
        transaksiHarianBackBtn.addEventListener('click', closeTransaksiHarianView);
        const dpSubtotal = document.getElementById('dp-subtotal');
        const dpDiskonFixed = document.getElementById('dp-diskon-fixed');
        const dpDiskonPercent = document.getElementById('dp-diskon-percent');
        const dpPajakFixed = document.getElementById('dp-pajak-fixed');
        const dpPajakToggle = document.getElementById('dp-pajak-toggle');
        const dpCloseBtn = document.getElementById('dp-close-btn');
        const dpSaveBtn = document.getElementById('dp-save-btn');
        const ubahNotaBtn = document.getElementById('ubah-nota-btn');
        const ubahNotaOverlay = document.getElementById('ubah-nota-overlay');
        const closeUbahNotaBtn = document.getElementById('close-ubah-nota-btn');
        const printBtn = document.getElementById('print-btn');
        const printOptionsOverlay = document.getElementById('print-options-overlay');
        const printOptionsModal = document.getElementById('print-options-modal');
        const closePrintOptionsBtn = document.getElementById('close-print-options-btn');
        const printNotaBtn = document.getElementById('print-nota-btn');
        const printDapurBtn = document.getElementById('print-dapur-btn');
        const printCheckerBtn = document.getElementById('print-checker-btn');
        const paymentSuccessOverlay = document.getElementById('payment-success-overlay');
        const successNotaId = document.getElementById('success-nota-id');
        const successTamu = document.getElementById('success-tamu');
        const successGrandTotal = document.getElementById('success-grand-total');
        const successTotalPembayaran = document.getElementById('success-total-pembayaran');
        const successKembalian = document.getElementById('success-kembalian');
        const lihatNotaBtn = document.getElementById('lihat-nota-btn');
        const closeSuccessModalBtn = document.getElementById('close-success-modal-btn');
        const productGrid = document.getElementById('product-grid');
        const categoryFilterContainer = document.getElementById('category-filter-container');
        const orderItemsContainer = document.getElementById('order-items-container');
        const emptyCartMsg = document.getElementById('empty-cart-msg');
        const searchInput = document.getElementById('search-input');
        const payBtn = document.getElementById('pay-btn');
        const saveBtn = document.getElementById('save-btn');
        const cancelBtn = document.getElementById('cancel-btn');
        const totalProdukEl = document.getElementById('total-produk');
        const grandTotalEl = document.getElementById('grand-total');
        const notaIdEl = document.getElementById('nota-id');
        const customerNameDisplay = document.getElementById('customer-name-display');
        const productModalOverlay = document.getElementById('product-modal-overlay');
        const paymentModalOverlay = document.getElementById('payment-modal-overlay');
        const activeOrdersModalOverlay = document.getElementById('active-orders-modal-overlay');
        const confirmAddProductBtn = document.getElementById('confirm-add-product-btn');
        const modalItemCountEl = document.getElementById('modal-item-count');
        const modalTotalPriceEl = document.getElementById('modal-total-price');
        const openChargeModalOverlay = document.getElementById('open-charge-modal-overlay');
        const openChargeBtn = document.getElementById('open-charge-btn');
        const confirmOpenChargeBtn = document.getElementById('confirm-open-charge-btn');
        const cancelOpenChargeBtn = document.getElementById('cancel-open-charge-btn');
        const openChargeNameInput = document.getElementById('open-charge-name');
        const openChargePriceInput = document.getElementById('open-charge-price');
        const notaDetailModalOverlay = document.getElementById('nota-detail-modal-overlay');
        const notaBaruBtn = document.getElementById('nota-baru-btn');
        const closeNotaDetailBtn = document.getElementById('close-nota-detail-btn');
        const saveNotaDetailBtn = document.getElementById('save-nota-detail-btn');
        const detailTipeTransaksi = document.getElementById('detail-tipe-transaksi');
        const detailTamuInput = document.getElementById('detail-tamu-input');
        const detailTamuCount = document.getElementById('detail-tamu-count');
        const detailTamuMinus = document.getElementById('detail-tamu-minus');
        const detailTamuPlus = document.getElementById('detail-tamu-plus');
        const detailCatatan = document.getElementById('detail-catatan');
        const daftarMejaBtn = document.getElementById('daftar-meja-btn');
        const daftarMejaModalOverlay = document.getElementById('daftar-meja-modal-overlay');
        const closeDaftarMejaBtn = document.getElementById('close-daftar-meja-btn');
        const areaUtamaBtn = document.getElementById('area-utama-btn');
        const areaUtamaDisplay = document.getElementById('area-utama-display');
        const areaMejaOverlay = document.getElementById('area-meja-overlay');
        const areaMejaModal = document.getElementById('area-meja-modal');
        const areaMejaOptions = document.querySelectorAll('.area-meja-option');
        const mejaTerisiBtn = document.getElementById('meja-terisi-btn');
        const mejaTerisiDisplay = document.getElementById('meja-terisi-display');
        const mejaStatusOverlay = document.getElementById('meja-status-overlay');
        const mejaStatusModal = document.getElementById('meja-status-modal');
        const mejaStatusOptions = document.querySelectorAll('.meja-status-option');
        const tablesGridContainer = document.getElementById('tables-grid-container');
        const splitBtn = document.getElementById('split-btn');
        const splitBillView = document.getElementById('split-bill-view');
        const splitSourceTitle = document.getElementById('split-source-title');
        const splitSourceList = document.getElementById('split-source-list');
        const splitDestinationList = document.getElementById('split-destination-list');
        const moveUpBtn = document.getElementById('split-move-up-btn');
        const moveDownBtn = document.getElementById('split-move-down-btn');
        const splitCloseBtn = document.getElementById('split-close-btn');
        const splitResetBtn = document.getElementById('split-reset-btn');
        const splitSaveBtn = document.getElementById('split-save-btn');
        
        const paymentMainModal = document.getElementById('payment-main-modal');
        const paymentNotaIdEl = document.getElementById('payment-nota-id');
        const summaryGrandTotalEl = document.getElementById('summary-grand-total');
        const summaryPaymentTotalEl = document.getElementById('summary-payment-total');
        const summarySisaEl = document.getElementById('summary-sisa');
        const summaryKembalianEl = document.getElementById('summary-kembalian');
        const paymentListContainer = document.getElementById('payment-list-container');
        const confirmPaymentBtn = document.getElementById('confirm-payment-btn');
        const numpadModal = document.getElementById('numpad-modal');
        const numpadSisaEl = document.getElementById('numpad-sisa');
        const numpadDisplay = document.getElementById('numpad-display');
        const numpadMethodTitle = document.getElementById('numpad-method-title');
        // --- [BARU] Logika untuk Halaman Laporan ---
        
        // 1. Deklarasi elemen-elemen dari halaman Laporan
        const laporanView = document.getElementById('laporan-view');
        const bukaLaporanBtn = document.getElementById('buka-laporan-btn');
        const laporanBackBtn = document.getElementById('laporan-back-btn');
        const laporanTransaksiHarianBtn = document.getElementById('laporan-transaksi-harian');
        
        // 2. Fungsi untuk membuka dan menutup halaman Laporan
        function openLaporanView() {
            laporanView.classList.remove('translate-x-full');
        }
        
        function closeLaporanView() {
            laporanView.classList.add('translate-x-full');
        }
        
        // 3. Tambahkan aksi klik (event listener)
        
        // Klik tombol "Laporan" di sidebar akan membuka halaman Laporan
        bukaLaporanBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openLaporanView();
            closeSidebar(); // Sekalian tutup sidebar agar rapi
        });
        
        // Klik tombol kembali di header Laporan akan menutup halaman
        laporanBackBtn.addEventListener('click', closeLaporanView);
        
        // Beri fungsi pada tombol "Transaksi Harian"
        laporanTransaksiHarianBtn.addEventListener('click', (e) => {
            e.preventDefault();
            // Kita panggil fungsi yang sudah ada untuk membuka halaman transaksi harian
            openTransaksiHarianView();
        });
        
        // Untuk tombol-tombol laporan lainnya, kita beri pesan sementara
        document.getElementById('laporan-ringkasan-penjualan').addEventListener('click', () => alert('Fitur "Ringkasan Penjualan" akan dibuat selanjutnya.'));
        document.getElementById('laporan-closing').addEventListener('click', () => alert('Fitur "Laporan Closing" akan dibuat selanjutnya.'));
        document.getElementById('laporan-penjualan-produk').addEventListener('click', () => alert('Fitur "Penjualan Produk" akan dibuat selanjutnya.'));
        document.getElementById('laporan-penjualan-kategori').addEventListener('click', () => alert('Fitur "Penjualan Produk per Kategori" akan dibuat selanjutnya.'));
        document.getElementById('laporan-penjualan-modifier').addEventListener('click', () => alert('Fitur "Penjualan Modifier" akan dibuat selanjutnya.'));
        document.getElementById('laporan-tipe-transaksi').addEventListener('click', () => alert('Fitur "Penjualan Tipe Transaksi" akan dibuat selanjutnya.'));
        document.getElementById('laporan-kas-kecil').addEventListener('click', () => alert('Fitur "Kas Kecil" akan dibuat selanjutnya.'));
        
        // --- Batas Logika Halaman Laporan ---
        function openPaymentModal() {
            // 1. Hitung total belanjaan dari keranjang saat ini
            const { total } = calculateTotals();
            
            // Pengecekan jika totalnya 0 atau kurang, tidak perlu bayar
            if (total <= 0) {
                alert("Total pembayaran adalah nol, tidak perlu melakukan pembayaran.");
                return;
            }
            
            // 2. Siapkan dan reset status untuk sesi pembayaran baru
            totalDueForPayment = total; // Simpan total yang harus dibayar
            payments = []; // Kosongkan daftar pembayaran sebelumnya
            currentPaymentInput = '0'; // Reset input numpad
            
            // 3. Perbarui tampilan di dalam modal pembayaran dengan data terbaru
            // Tampilkan ID Nota jika sudah ada, jika tidak tampilkan nama meja atau "Nota Baru"
            paymentNotaIdEl.textContent = cart.shortId ? `#${cart.shortId}` : (cart.tableName || 'Nota Baru');
            
            // Panggil fungsi updatePaymentSummary() untuk menampilkan Grand Total, Sisa, dll.
            updatePaymentSummary();
            
            // 4. Tampilkan modal pembayaran ke layar
            openModal(paymentModalOverlay);
        }
        payBtn.addEventListener('click', () => {
            if (cart.items.length > 0) openPaymentModal();
            else alert("Keranjang kosong!");
        });
        // [BARU] Logika untuk datepicker
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        
        function updateDatepickerDisplay() {
            thDateDay.textContent = tempDate.getDate();
            thDateMonth.textContent = months[tempDate.getMonth()];
            thDateYear.textContent = tempDate.getFullYear();
        }
        
        thDatepickerModal.addEventListener('click', (e) => {
            const targetId = e.target.id;
            if (targetId === 'th-date-plus-day') tempDate.setDate(tempDate.getDate() + 1);
            if (targetId === 'th-date-minus-day') tempDate.setDate(tempDate.getDate() - 1);
            if (targetId === 'th-date-plus-month') tempDate.setMonth(tempDate.getMonth() + 1);
            if (targetId === 'th-date-minus-month') tempDate.setMonth(tempDate.getMonth() - 1);
            if (targetId === 'th-date-plus-year') tempDate.setFullYear(tempDate.getFullYear() + 1);
            if (targetId === 'th-date-minus-year') tempDate.setFullYear(tempDate.getFullYear() - 1);
            updateDatepickerDisplay();
        });
        
        thDatepickerSelectBtn.addEventListener('click', () => {
            if (datepickerContext === 'transaksi') {
                // Logika untuk Transaksi Harian
                thCurrentDate = new Date(tempDate);
                thDatepickerBtn.textContent = thCurrentDate.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
                renderTransaksiHarian();
            } else if (datepickerContext === 'summary') {
                // Logika untuk Ringkasan Penjualan
                summaryCurrentDate = new Date(tempDate);
                summaryDatepickerBtn.textContent = summaryCurrentDate.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
                generateSalesSummary();
            }
            closeThDatepickerModal();
        });
        tdCloseBtn.addEventListener('click', closeTransaksiDetailView);
        // KODE BARU
        tdPrintBtn.addEventListener('click', () => {
            printViaBluetooth(); // Panggil fungsi cetak Bluetooth
        });
        tdWhatsappBtn.addEventListener('click', shareReceiptViaWhatsApp); // Menggunakan fungsi yang sudah ada
        tdVoidBtn.addEventListener('click', handleVoidNota); // Menggunakan fungsi yang sudah ada
        
        // Untuk tombol email, kita perlu memastikan datanya benar
        tdEmailBtn.addEventListener('click', () => {
            if (!currentViewingOrder) return;
            const receiptText = generateReceiptText(currentViewingOrder);
            const subject = `Nota Pembayaran #${currentViewingOrder.fullId}`;
            window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(receiptText)}`;
        });
        confirmPaymentBtn.addEventListener('click', async () => {
            if (cart.items.length === 0) return;
            const { sub, tax, total, discountAmount } = calculateTotals();
            const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
            const change = Math.max(0, totalPaid - total);
            
            let shortId, fullId;
            
            // **PERBAIKAN: Cek apakah nota ini sudah punya ID (dari nota aktif)**
            if (cart.shortId && cart.fullId) {
                // Jika sudah, gunakan ID yang ada
                shortId = cart.shortId;
                fullId = cart.fullId;
            } else {
                // Jika ini nota yang benar-benar baru, buatkan ID baru
                const generatedIds = await generateNewNotaId();
                shortId = generatedIds.shortId;
                fullId = generatedIds.fullId;
            }
            
            const orderData = {
                shortId: shortId,
                fullId: fullId,
                items: cart.items,
                subtotal: sub,
                discount: discountAmount || 0,
                tax: tax,
                total: total,
                customerName: cart.customerName,
                isTakeAway: takeAwayToggle.checked,
                payments: payments,
                change: change,
                status: 'Selesai',
                timestamp: serverTimestamp(),
                tableName: cart.tableName || null,
                promoName: cart.promo ? cart.promo.name : null
            };
            
            try {
                let orderId = cart.id;
                if (orderId) {
                    await updateDoc(doc(db, "orders", orderId), orderData);
                } else {
                    const docRef = await addDoc(collection(db, "orders"), orderData);
                    orderId = docRef.id;
                }
                lastSuccessfulOrder = { ...orderData, id: orderId };
                closeModal(paymentModalOverlay);
                showSuccessModal(lastSuccessfulOrder);
            } catch (e) {
                console.error("Error processing payment: ", e);
                alert("Gagal memproses pembayaran.");
            }
        });
        
        function generateEscPosCommands(order) {
            // TextEncoder diperlukan untuk mengubah string menjadi byte array (Uint8Array)
            const encoder = new TextEncoder();
            
            // Kumpulan perintah dasar ESC/POS
            const INIT = '\x1B\x40'; // Inisialisasi/reset printer
            const BOLD_ON = '\x1B\x45\x01'; // Aktifkan mode tebal
            const BOLD_OFF = '\x1B\x45\x00'; // Matikan mode tebal
            const ALIGN_CENTER = '\x1B\x61\x01'; // Rata tengah
            const ALIGN_LEFT = '\x1B\x61\x00'; // Rata kiri
            const LF = '\x0A'; // Line Feed (pindah baris)
            const CUT_PAPER = '\x1D\x56\x42\x00'; // Perintah potong kertas
            
            let commands = INIT; // Mulai dengan reset printer
            
            // --- Bagian Header Nota ---
            const date = new Date(order.timestamp?.seconds * 1000 || Date.now());
            const timeStr = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
            
            commands += ALIGN_CENTER;
            commands += BOLD_ON + 'Ayam Penyet Surabaya' + BOLD_OFF + LF;
            commands += '--------------------------------' + LF;
            commands += ALIGN_LEFT;
            commands += `Nota: ${order.shortId || order.id.substring(0, 6)}` + LF;
            commands += `Kasir: Demo Account` + LF;
            commands += `Tamu: ${order.customerName}` + LF;
            commands += `Tanggal: ${date.toLocaleDateString('id-ID')} ${timeStr}` + LF;
            commands += '--------------------------------' + LF;
            
            // --- Bagian Item Belanja ---
            order.items.forEach(item => {
                const total = formatNumber(item.price * item.quantity);
                const name = item.name.padEnd(20, ' '); // Atur panjang nama item
                const line = `${item.quantity} ${name} ${total}`;
                commands += line + LF;
            });
            commands += '--------------------------------' + LF;
            
            // --- Bagian Total ---
            commands += `Subtotal : ${formatNumber(order.subtotal).padStart(18)}` + LF;
            if (order.discount > 0) {
                commands += `Diskon   : -${formatNumber(order.discount).padStart(18)}` + LF;
            }
            commands += `Pajak 10% : ${formatNumber(order.tax).padStart(18)}` + LF;
            commands += BOLD_ON;
            commands += `TOTAL    : ${formatNumber(order.total).padStart(18)}` + BOLD_OFF + LF;
            commands += '--------------------------------' + LF;
            
            // --- Bagian Pembayaran ---
            order.payments.forEach(p => {
                commands += `${p.method.padEnd(12)}: ${formatNumber(p.amount).padStart(18)}` + LF;
            });
            commands += `Kembali  : ${formatNumber(order.change).padStart(18)}` + LF;
            commands += '--------------------------------' + LF + LF;
            
            // --- Bagian Footer ---
            commands += ALIGN_CENTER;
            commands += 'Terima Kasih!' + LF;
            commands += 'Powered by Laris POS' + LF + LF + LF;
            
            // --- Perintah Akhir ---
            commands += CUT_PAPER;
            
            // Ubah seluruh string perintah menjadi byte array
            return encoder.encode(commands);
        }
        async function printViaBluetooth() {
            // Cek apakah ada nota yang sedang aktif untuk dicetak
            const orderToPrint = lastSuccessfulOrder || currentViewingOrder || cart;
            if (!orderToPrint || orderToPrint.items.length === 0) {
                alert("Tidak ada data nota untuk dicetak. Selesaikan pembayaran atau buka nota dari daftar transaksi.");
                return;
            }
            
            // Cek apakah browser mendukung Web Bluetooth API
            if (!navigator.bluetooth) {
                alert("Browser Anda tidak mendukung Web Bluetooth API. Coba gunakan Google Chrome di Android atau Desktop.");
                return;
            }
            
            try {
                // 1. Minta pengguna memilih perangkat Bluetooth
                console.log('Mencari printer Bluetooth...');
                alert('Nyalakan Bluetooth di HP/Laptop Anda dan pastikan printer sudah menyala. Lalu, pilih nama printer dari daftar yang muncul.');
                
                const device = await navigator.bluetooth.requestDevice({
                    filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }], // Saring hanya perangkat dengan 'Serial Port Profile'
                    acceptAllDevices: false,
                });
                
                console.log('Printer dipilih:', device.name);
                alert(`Menyambungkan ke printer: ${device.name}...`);
                
                // 2. Hubungkan ke server GATT di perangkat
                const server = await device.gatt.connect();
                console.log('Berhasil terhubung ke GATT server.');
                
                // 3. Dapatkan Service dan Characteristic untuk komunikasi
                const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
                const characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');
                console.log('Berhasil mendapatkan characteristic.');
                
                // 4. Siapkan data nota menjadi perintah ESC/POS
                // Jika nota berasal dari 'cart', kita perlu simulasi data pembayaran dan total
                let finalOrderData = orderToPrint;
                if (!orderToPrint.total) {
                    const { total, sub, tax, discountAmount } = calculateTotals(orderToPrint.items);
                    finalOrderData = {
                        ...orderToPrint,
                        total,
                        subtotal: sub,
                        tax,
                        discount: discountAmount,
                        payments: [{ method: 'TUNAI', amount: total }],
                        change: 0,
                        timestamp: { seconds: Date.now() / 1000 }
                    }
                }
                
                const data = generateEscPosCommands(finalOrderData);
                console.log('Data ESC/POS siap dikirim.');
                
                // 5. Kirim data ke printer
                await characteristic.writeValue(data);
                console.log('Data berhasil dikirim ke printer.');
                alert('Nota berhasil dikirim ke printer!');
                
            } catch (error) {
                console.error('Terjadi kesalahan:', error);
                alert(`Gagal mencetak: ${error.message}`);
            }
        }
        
        function openTransaksiDetailView(order) {
            // Isi data ke elemen-elemen di halaman detail
            tdShortId.textContent = order.shortId || 'N/A';
            tdFullId.textContent = order.fullId || order.id;
            tdStatus.textContent = order.status;
            
            // Atur warna status badge
            tdStatus.className = 'font-bold px-6 py-2 rounded-lg flex items-center justify-center'; // Reset
            if (order.status === 'Selesai') tdStatus.classList.add('bg-yellow-200', 'text-yellow-800');
            else if (order.status === 'Void') tdStatus.classList.add('bg-red-200', 'text-red-800');
            else tdStatus.classList.add('bg-blue-200', 'text-blue-800');
            
            // Hasilkan HTML struk dan masukkan ke dalam content wrapper
            tdReceiptContent.innerHTML = generateReceiptHTML(order);
            
            // Tampilkan halaman
            transaksiDetailView.classList.remove('translate-y-full');
        }
        
        function closeTransaksiDetailView() {
            transaksiDetailView.classList.add('translate-y-full');
        }
        
        function openPrintOptionsModal() {
            printOptionsOverlay.classList.remove('hidden');
            printOptionsModal.classList.remove('translate-y-full');
        }
        
        function closePrintOptionsModal() {
            printOptionsOverlay.classList.add('hidden');
            printOptionsModal.classList.add('translate-y-full');
        }
        
        printBtn.addEventListener('click', () => {
            if (cart.items.length > 0) {
                openPrintOptionsModal();
            } else {
                alert('Keranjang kosong, tidak ada yang bisa dicetak.');
            }
        });
        
        const ubahNotaDiskonBtn = ubahNotaOverlay.querySelector('button:nth-of-type(1)');
        const ubahNotaBiayaBtn = ubahNotaOverlay.querySelector('button:nth-of-type(2)');
        
        function openUbahNotaModal() {
            ubahNotaOverlay.classList.remove('hidden');
            ubahNotaOverlay.classList.add('flex');
            setTimeout(() => ubahNotaOverlay.querySelector('.modal-content')?.classList.remove('scale-95', 'opacity-0'), 10);
        }
        
        function closeUbahNotaModal() {
            ubahNotaOverlay.querySelector('.modal-content')?.classList.add('scale-95', 'opacity-0');
            setTimeout(() => {
                ubahNotaOverlay.classList.add('hidden');
                ubahNotaOverlay.classList.remove('flex');
            }, 300);
        }
        
        ubahNotaBtn.addEventListener('click', () => {
            if (cart.items.length === 0) {
                alert('Keranjang kosong. Tidak ada nota untuk diubah.');
                return;
            }
            openUbahNotaModal();
        });
        
        closeUbahNotaBtn.addEventListener('click', closeUbahNotaModal);
        ubahNotaOverlay.addEventListener('click', (e) => {
            if (e.target === ubahNotaOverlay) {
                closeUbahNotaModal();
            }
        });
        
        ubahNotaDiskonBtn.addEventListener('click', () => {
            if (cart.items.length === 0) {
                alert("Keranjang kosong!");
                return;
            }
            closeModal(ubahNotaOverlay);
            openDiskonPajakModal();
        });
        // TAMBAHKAN EVENT LISTENER BARU INI
        dpDiskonBtnFixed.addEventListener('click', () => {
            cart.discountType = 'fixed';
            dpDiskonSlider.style.transform = 'translateX(0%)';
            dpDiskonBtnFixed.classList.remove('text-gray-500');
            dpDiskonBtnPercent.classList.add('text-gray-500');
            dpDiskonFixed.classList.remove('bg-gray-100');
            dpDiskonPercent.classList.add('bg-gray-100');
            dpDiskonPercent.value = 0; // Reset input persen
        });
        
        dpDiskonBtnPercent.addEventListener('click', () => {
            cart.discountType = 'percent';
            dpDiskonSlider.style.transform = 'translateX(100%)';
            dpDiskonBtnPercent.classList.remove('text-gray-500');
            dpDiskonBtnFixed.classList.add('text-gray-500');
            dpDiskonPercent.classList.remove('bg-gray-100');
            dpDiskonFixed.classList.add('bg-gray-100');
            dpDiskonFixed.value = 0; // Reset input fixed
        });
        
        dpSaveBtn.addEventListener('click', () => {
            // PERBAIKAN: Hapus promo yang sedang aktif karena user memilih diskon manual
            if (cart.promo) {
                delete cart.promo;
            }
            
            if (cart.discountType === 'percent') {
                cart.discountValue = parseFloat(dpDiskonPercent.value) || 0;
            } else { // 'fixed'
                cart.discountValue = parseFloat(dpDiskonFixed.value) || 0;
            }
            cart.taxEnabled = dpPajakToggle.classList.contains('bg-yellow-300');
            renderOrder();
            closeModal(diskonPajakOverlay);
        });
        
        dpPajakToggle.addEventListener('click', () => {
            dpPajakToggle.classList.toggle('bg-yellow-300');
            dpPajakToggle.classList.toggle('bg-gray-200');
        });
        
        
        // --- [BARU] Event Listeners untuk Filter Transaksi Harian ---
        
        // Fungsi untuk membuka/menutup modal status
        function openThStatusModal() {
            // Tandai status yang sedang aktif
            document.querySelectorAll('.th-status-option').forEach(opt => {
                const status = opt.dataset.status;
                if (status === thCurrentStatus) {
                    opt.classList.add('font-semibold', 'text-blue-600', 'bg-blue-50');
                } else {
                    opt.classList.remove('font-semibold', 'text-blue-600', 'bg-blue-50');
                }
            });
            thStatusOverlay.classList.remove('hidden');
            thStatusModal.classList.remove('translate-y-full');
        }
        
        function closeThStatusModal() {
            thStatusOverlay.classList.add('hidden');
            thStatusModal.classList.add('translate-y-full');
        }
        
        // Fungsi untuk membuka/menutup modal tanggal
        function openThDatepickerModal() {
            tempDate = new Date(thCurrentDate); // Salin tanggal saat ini ke tanggal sementara
            updateDatepickerDisplay();
            openModal(thDatepickerOverlay);
        }
        
        function closeThDatepickerModal() {
            closeModal(thDatepickerOverlay);
        }
        
        thStatusFilterBtn.addEventListener('click', openThStatusModal);
        thStatusOverlay.addEventListener('click', closeThStatusModal);
        thStatusCloseBtn.addEventListener('click', closeThStatusModal);
        
        thDatepickerBtn.addEventListener('click', openThDatepickerModal);
        thDatepickerCloseBtn.addEventListener('click', closeThDatepickerModal);
        // [BARU] Event listener untuk pilihan status
        thStatusOptionsContainer.addEventListener('click', (e) => {
            const target = e.target.closest('.th-status-option');
            if (!target) return;
            
            thCurrentStatus = target.dataset.status;
            thStatusFilterBtn.textContent = thCurrentStatus;
            renderTransaksiHarian();
            closeThStatusModal();
        });
        dpDiskonPercent.addEventListener('input', () => {
            // 1. Ambil subtotal saat ini
            const { sub } = calculateTotals();
            
            // 2. Baca nilai persen yang diketik
            const diskonPersen = parseFloat(dpDiskonPercent.value) || 0;
            
            // 3. Hitung jumlah diskon dalam Rupiah
            const diskonAmount = sub * (diskonPersen / 100);
            
            // 4. Masukkan hasilnya ke kolom Rupiah (dibulatkan)
            dpDiskonFixed.value = Math.round(diskonAmount);
            
            // 5. Perbarui juga kolom pajak secara otomatis
            updatePajakField();
        });
        
        dpDiskonFixed.addEventListener('input', () => {
            // Jika mengisi kolom Rupiah, reset kolom persen agar tidak ada data ganda
            dpDiskonPercent.value = 0;
            
            // Perbarui kolom pajak
            updatePajakField();
        });
        
        // Pastikan Anda sudah memiliki fungsi ini dari langkah sebelumnya
        function updatePajakField() {
            const { sub } = calculateTotals();
            const diskonPersen = parseFloat(dpDiskonPercent.value) || 0;
            const diskonFixed = parseFloat(dpDiskonFixed.value) || 0;
            
            let subAfterDiscount;
            if (cart.discountType === 'percent') {
                subAfterDiscount = sub - (sub * (diskonPersen / 100));
            } else {
                subAfterDiscount = sub - diskonFixed;
            }
            
            if (dpPajakToggle.classList.contains('bg-yellow-300')) { // Cek jika pajak aktif
                const pajakAmount = subAfterDiscount * 0.10;
                dpPajakFixed.value = formatNumber(pajakAmount);
            } else {
                dpPajakFixed.value = 0;
            }
        }
        dpCloseBtn.addEventListener('click', () => closeModal(diskonPajakOverlay));
        
        
        ubahNotaBiayaBtn.addEventListener('click', () => {
            alert('Fitur Biaya Tambahan akan dibuat selanjutnya.');
            closeUbahNotaModal();
        });
        
        function renderSplitLists() {
            splitSourceList.innerHTML = '';
            sourceSplitItems.forEach((item, index) => {
                const itemDiv = document.createElement('div');
                itemDiv.className = `grid grid-cols-12 gap-2 px-3 py-2 border-b cursor-pointer`;
                if (index === selectedSourceIndex) {
                    itemDiv.classList.add('bg-yellow-100');
                }
                itemDiv.innerHTML = `
                    <div class="col-span-2 font-semibold">${item.quantity}</div>
                    <div class="col-span-10">${item.name}</div>
                `;
                itemDiv.addEventListener('click', () => {
                    selectedSourceIndex = index;
                    selectedDestinationIndex = null;
                    renderSplitLists();
                });
                splitSourceList.appendChild(itemDiv);
            });
            
            splitDestinationList.innerHTML = '';
            destinationSplitItems.forEach((item, index) => {
                const itemDiv = document.createElement('div');
                itemDiv.className = `grid grid-cols-12 gap-2 px-3 py-2 border-b cursor-pointer`;
                if (index === selectedDestinationIndex) {
                    itemDiv.classList.add('bg-blue-100');
                }
                itemDiv.innerHTML = `
                    <div class="col-span-2 font-semibold">${item.quantity}</div>
                    <div class="col-span-10">${item.name}</div>
                `;
                itemDiv.addEventListener('click', () => {
                    selectedDestinationIndex = index;
                    selectedSourceIndex = null;
                    renderSplitLists();
                });
                splitDestinationList.appendChild(itemDiv);
            });
        }
        
        // KODE BARU
        function openSplitBillView() {
            if (cart.items.length < 2) {
                alert('Tidak bisa pisah nota dengan kurang dari 2 item.');
                return;
            }
            
            sourceSplitItems = JSON.parse(JSON.stringify(cart.items));
            destinationSplitItems = [];
            selectedSourceIndex = null;
            selectedDestinationIndex = null;
            
            // Judul nota disesuaikan jika nota belum punya ID
            splitSourceTitle.textContent = cart.id ?
                `ID Nota #${cart.id.substring(0,6).toUpperCase()}` :
                'Nota Saat Ini';
            
            renderSplitLists();
            splitBillView.classList.remove('translate-y-full');
        }
        
        function closeSplitBillView() {
            splitBillView.classList.add('translate-y-full');
        }
        
        splitBtn.addEventListener('click', openSplitBillView);
        splitCloseBtn.addEventListener('click', closeSplitBillView);
        
        splitResetBtn.addEventListener('click', () => {
            sourceSplitItems = JSON.parse(JSON.stringify(cart.items));
            destinationSplitItems = [];
            selectedSourceIndex = null;
            selectedDestinationIndex = null;
            renderSplitLists();
        });
        
        moveDownBtn.addEventListener('click', () => {
            if (selectedSourceIndex !== null && sourceSplitItems[selectedSourceIndex]) {
                const itemToMove = sourceSplitItems.splice(selectedSourceIndex, 1)[0];
                destinationSplitItems.push(itemToMove);
                selectedSourceIndex = null;
                renderSplitLists();
            }
        });
        
        moveUpBtn.addEventListener('click', () => {
            if (selectedDestinationIndex !== null && destinationSplitItems[selectedDestinationIndex]) {
                const itemToMove = destinationSplitItems.splice(selectedDestinationIndex, 1)[0];
                sourceSplitItems.push(itemToMove);
                selectedDestinationIndex = null;
                renderSplitLists();
            }
        });
        
        // KODE FINAL UNTUK EVENT LISTENER splitSaveBtn
        // KODE BARU
        splitSaveBtn.addEventListener('click', async () => {
            if (sourceSplitItems.length === 0 || destinationSplitItems.length === 0) {
                alert('Setiap nota harus memiliki minimal satu item setelah dipisah.');
                return;
            }
            try {
                if (cart.id) {
                    // Skenario 1: Memisah nota yang sudah ada
                    const { sub: updatedSub, tax: updatedTax, total: updatedTotal } = calculateTotals(sourceSplitItems);
                    const updatedOrderData = {
                        items: sourceSplitItems,
                        subtotal: updatedSub,
                        tax: updatedTax,
                        total: updatedTotal,
                        customerName: cart.customerName || 'Umum',
                        tableName: cart.tableName || null,
                        guestCount: cart.guestCount || 1,
                        isTakeAway: cart.isTakeAway || false,
                        status: 'Aktif',
                        notes: cart.notes || ''
                    };
                    
                    const { sub: newSub, tax: newTax, total: newTotal } = calculateTotals(destinationSplitItems);
                    const newOrderData = {
                        items: destinationSplitItems,
                        subtotal: newSub,
                        tax: newTax,
                        total: newTotal,
                        customerName: `${cart.customerName || 'Umum'} (Split)`,
                        tableName: cart.tableName || null,
                        guestCount: cart.guestCount || 1,
                        isTakeAway: cart.isTakeAway || false,
                        status: 'Aktif',
                        notes: cart.notes || '',
                        timestamp: serverTimestamp()
                    };
                    
                    await updateDoc(doc(db, "orders", cart.id), updatedOrderData);
                    await addDoc(collection(db, "orders"), newOrderData);
                } else {
                    // Skenario 2: Memisah nota yang belum disimpan
                    const { sub: sub1, tax: tax1, total: total1 } = calculateTotals(sourceSplitItems);
                    const orderData1 = {
                        items: sourceSplitItems,
                        subtotal: sub1,
                        tax: tax1,
                        total: total1,
                        customerName: cart.customerName || 'Umum',
                        tableName: cart.tableName || null,
                        guestCount: cart.guestCount || 1,
                        isTakeAway: cart.isTakeAway || false,
                        status: 'Aktif',
                        notes: cart.notes || '',
                        timestamp: serverTimestamp()
                    };
                    
                    const { sub: sub2, tax: tax2, total: total2 } = calculateTotals(destinationSplitItems);
                    const orderData2 = {
                        items: destinationSplitItems,
                        subtotal: sub2,
                        tax: tax2,
                        total: total2,
                        customerName: `${cart.customerName || 'Umum'} (Split)`,
                        tableName: cart.tableName || null,
                        guestCount: cart.guestCount || 1,
                        isTakeAway: cart.isTakeAway || false,
                        status: 'Aktif',
                        notes: cart.notes || '',
                        timestamp: serverTimestamp()
                    };
                    
                    await addDoc(collection(db, "orders"), orderData1);
                    await addDoc(collection(db, "orders"), orderData2);
                }
                alert('Nota berhasil dipisah!');
                closeSplitBillView(); // Gunakan fungsi closeModal jika ada, atau ganti dengan kode yang sesuai
                clearOrder();
            } catch (error) {
                console.error("Firestore Save Error:", error);
                alert("Terjadi kesalahan saat menyimpan. Cek console (F12) untuk detail.");
            }
        });
        
        printOptionsOverlay.addEventListener('click', closePrintOptionsModal);
        closePrintOptionsBtn.addEventListener('click', closePrintOptionsModal);
        
        // KODE BARU
        printNotaBtn.addEventListener('click', () => {
            printViaBluetooth(); // Panggil fungsi cetak Bluetooth
            closePrintOptionsModal();
        });
        printDapurBtn.addEventListener('click', () => {
            alert('Fungsi "Cetak ke Dapur" akan diimplementasikan.');
            closePrintOptionsModal();
        });
        printCheckerBtn.addEventListener('click', () => {
            alert('Fungsi "Cetak Checker" akan diimplementasikan.');
            closePrintOptionsModal();
        });
        
        function showSuccessModal(order) {
            const totalPaid = order.payments.reduce((sum, p) => sum + p.amount, 0);
            successNotaId.textContent = order.fullId || order.id.toUpperCase().substring(0, 12);
            successTamu.textContent = order.customerName;
            successGrandTotal.textContent = formatNumber(order.total);
            successTotalPembayaran.textContent = formatNumber(totalPaid);
            successKembalian.textContent = formatNumber(order.change);
            openModal(paymentSuccessOverlay);
        }
        
        
        // [BARU] Fungsi untuk mem-void nota
        async function handleVoidNota() {
            if (!currentViewingOrder) {
                alert("Tidak ada nota yang sedang dilihat.");
                return;
            }
            
            if (currentViewingOrder.status === 'Void') {
                alert("Nota ini sudah berstatus Void.");
                return;
            }
            
            const confirmation = confirm(`Anda yakin ingin membatalkan (VOID) nota #${currentViewingOrder.shortId}? Tindakan ini tidak dapat diurungkan.`);
            
            if (confirmation) {
                try {
                    const orderRef = doc(db, "orders", currentViewingOrder.id);
                    // Update status menjadi "Void" di Firestore
                    await updateDoc(orderRef, {
                        status: "Void"
                    });
                    alert(`Nota #${currentViewingOrder.shortId} berhasil di-void.`);
                    
                    // Tutup semua modal yang mungkin terbuka
                    closeTransaksiDetailView();
                    
                    renderTransaksiHarian(); // Refresh daftar transaksi harian
                } catch (error) {
                    console.error("Gagal mem-void nota:", error);
                    alert("Terjadi kesalahan saat mem-void nota.");
                }
            }
        }
        
        // GANTI FUNGSI generateNewNotaId LAMA ANDA DENGAN YANG INI
        async function generateNewNotaId() {
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);
            
            const q = query(
                collection(db, "orders"),
                where("timestamp", ">=", startOfDay),
                orderBy("timestamp", "desc"), // Perbaikan: Urutkan berdasarkan waktu
                limit(1)
            );
            
            const querySnapshot = await getDocs(q);
            let newOrderNumber = 1;
            
            if (!querySnapshot.empty) {
                const lastOrder = querySnapshot.docs[0].data();
                if (lastOrder.shortId) {
                    const lastNumber = parseInt(lastOrder.shortId.substring(1));
                    newOrderNumber = lastNumber + 1;
                }
            }
            
            const paddedNumber = String(newOrderNumber).padStart(3, '0');
            const today = new Date();
            const d = String(today.getDate()).padStart(2, '0');
            const m = String(today.getMonth() + 1).padStart(2, '0');
            const y = String(today.getFullYear()).slice(-2);
            const dateString = `${d}${m}${y}`;
            
            const shortId = `A${paddedNumber}`;
            const fullId = `A${dateString}${paddedNumber}`;
            
            return { shortId, fullId };
        }
        // KODE BARU
        function generateReceiptText(order) {
            const date = new Date(order.timestamp?.seconds * 1000 || Date.now());
            let text = `*--- Detail Nota ---*\n\nAyam Penyet Surabaya\nReceipt: ${order.fullId || order.id.toUpperCase()}\nDate: ${date.toLocaleDateString('id-ID')} Time: ${date.toLocaleTimeString('id-ID')}\nCashier: Demo Account\nGuest: ${order.customerName}\n--------------------\n`;
            
            order.items.forEach(item => { text += `${item.quantity} ${item.name.padEnd(15)} ${formatNumber(item.price * item.quantity)}\n`; });
            
            text += `--------------------\nSubtotal: ${formatNumber(order.subtotal)}\n`;
            
            // Tambahkan baris diskon jika ada
            if (order.discount > 0) {
                text += `Diskon (${order.promoName || ''}): -${formatNumber(order.discount)}\n`;
            }
            
            text += `PB1 (10%): ${formatNumber(order.tax)}\n*Grand Total: ${formatNumber(order.total)}*\n--------------------\n`;
            
            order.payments.forEach(p => { text += `${p.method.toUpperCase()}: ${formatNumber(p.amount)}\n`; });
            
            text += `Change: ${formatNumber(order.change)}\n--------------------\n\nTerima Kasih\nPowered by HalalPos`;
            return text;
        }
        
        // KODE BARU
        // GANTI FUNGSI LAMA DENGAN INI
        function generateReceiptHTML(order) {
            const date = new Date(order.timestamp?.seconds * 1000 || Date.now());
            // AMANKAN NAMA ITEM DENGAN escapeHTML
            let itemsHtml = order.items.map(item => `<tr><td colspan="3">${item.quantity} ${escapeHTML(item.name)}</td><td class="text-right">${formatNumber(item.price * item.quantity)}</td></tr>`).join('');
            let paymentsHtml = order.payments.map(p => `<tr><td colspan="3">${p.method.toUpperCase()}</td><td class="text-right">${formatNumber(p.amount)}</td></tr>`).join('');
            
            let discountHtml = '';
            if (order.discount > 0) {
                // AMANKAN NAMA PROMO DENGAN escapeHTML
                discountHtml = `
            <tr>
                <td>Diskon (${escapeHTML(order.promoName) || ''})</td>
                <td>:</td>
                <td class="text-right">-${formatNumber(order.discount)}</td>
            </tr>
        `;
            }
            
            // AMANKAN NAMA PELANGGAN DENGAN escapeHTML
            return `<div class="receipt-content">
                <div class="text-center"><strong>Ayam Penyet Surabaya</strong><br></div>
                <hr>
                <p>Date: ${date.toLocaleDateString('id-ID')} &nbsp; Time: ${date.toLocaleTimeString('id-ID')}</p>
                <p>Guest: ${escapeHTML(order.customerName)} &nbsp; Pax: ${order.guestCount || 1}</p>
                <p>Cashier: Demo Account &nbsp; ${order.isTakeAway ? 'Take Away' : 'Dine In'}</p>
                <hr>
                <table class="w-full"><tbody>${itemsHtml}</tbody></table>
                <hr>
                <table class="w-full">
                    <tbody>
                        <tr>
                            <td>Subtotal</td>
                            <td>:</td>
                            <td class="text-right">${formatNumber(order.subtotal)}</td>
                        </tr>
                        ${discountHtml}
                        <tr>
                            <td>PB1 (10%)</td>
                            <td>:</td>
                            <td class="text-right">${formatNumber(order.tax)}</td>
                        </tr>
                        <tr>
                            <td><strong>Grand Total</strong></td>
                            <td>:</td>
                            <td class="text-right"><strong>${formatNumber(order.total)}</strong></td>
                        </tr>
                    </tbody>
                </table>
                <hr>
                <table class="w-full">
                    <tbody>
                        ${paymentsHtml}
                        <tr>
                            <td>Change</td>
                            <td>:</td>
                            <td class="text-right">${formatNumber(order.change)}</td>
                        </tr>
                    </tbody>
                </table>
                <hr>
                <div class="text-center">
                    <p>Terima Kasih</p>
                    <p>Receipt : ${order.fullId || order.id.toUpperCase()}</p>
                    <p>Printed : ${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')} ${date.toLocaleTimeString('id-ID')}</p>
                    <br>
                    <p>Powered by HalalPos</p>
                </div>
            </div>`;
        }
        
        lihatNotaBtn.addEventListener('click', () => {
            if (lastSuccessfulOrder) {
                closeModal(paymentSuccessOverlay);
                currentViewingOrder = lastSuccessfulOrder; // Set nota yang akan dilihat
                document.getElementById('print-area').innerHTML = generateReceiptHTML(lastSuccessfulOrder); // Siapkan area print
                
                // Panggil halaman detail yang BARU
                openTransaksiDetailView(lastSuccessfulOrder);
            }
        });
        closeSuccessModalBtn.addEventListener('click', () => { closeModal(paymentSuccessOverlay);
            clearOrder(); });
        
        // GANTI LAGI FUNGSI INI DENGAN VERSI FINAL YANG SUDAH DIPERBAIKI
        async function shareReceiptViaWhatsApp() {
            const orderToShare = currentViewingOrder || lastSuccessfulOrder;
            if (!orderToShare) {
                alert("Tidak ada data nota untuk dibagikan.");
                return;
            }
            
            // [BARU] Kita akan menggunakan elemen 'print-area' sebagai panggung
            const printArea = document.getElementById('print-area');
            if (!printArea) {
                alert("Elemen 'print-area' tidak ditemukan. Beralih ke mode teks.");
                shareReceiptAsText(orderToShare);
                return;
            }
            
            const receiptId = orderToShare.fullId || 'receipt';
            const fileName = `nota-${receiptId}.png`;
            const shareTitle = `Nota Pembayaran #${receiptId}`;
            
            // [BARU] Terapkan trik untuk memastikan seluruh konten dirender
            // 1. Isi print-area dengan HTML nota
            printArea.innerHTML = generateReceiptHTML(orderToShare);
            // 2. Beri style agar dirender di luar layar tapi dengan ukuran penuh
            printArea.style.position = 'absolute';
            printArea.style.left = '-9999px';
            printArea.style.display = 'block'; // Pastikan terlihat oleh html2canvas
            
            // Cek apakah browser mendukung Web Share API
            if (navigator.share && navigator.canShare) {
                try {
                    // [PERUBAIKAN] Targetkan 'printArea' yang sudah dirender penuh
                    const canvas = await html2canvas(printArea, { scale: 2 });
                    
                    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
                    const file = new File([blob], fileName, { type: 'image/png' });
                    
                    if (navigator.canShare({ files: [file] })) {
                        await navigator.share({
                            files: [file],
                            title: shareTitle,
                            text: `Berikut nota pembayaran Anda.`,
                        });
                    } else {
                        throw new Error('Tipe file ini tidak dapat dibagikan.');
                    }
                } catch (error) {
                    console.error('Gagal membagikan gambar, kembali ke metode teks:', error);
                    shareReceiptAsText(orderToShare);
                } finally {
                    // [BARU] Apapun hasilnya, bersihkan dan sembunyikan lagi print-area
                    printArea.style.display = 'none';
                    printArea.innerHTML = '';
                }
            } else {
                console.log('Web Share API tidak didukung, membagikan sebagai teks.');
                shareReceiptAsText(orderToShare);
                // [BARU] Jangan lupa bersihkan print-area di sini juga
                printArea.style.display = 'none';
                printArea.innerHTML = '';
            }
        }
        
        // Pastikan fungsi fallback ini masih ada di bawahnya
        function shareReceiptAsText(order) {
            if (!order) return;
            const receiptText = generateReceiptText(order);
            const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(receiptText)}`;
            window.open(whatsappUrl, '_blank');
        }
        
        // Ganti event listener yang lama dengan yang baru
        
        function updatePaymentSummary() {
            const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
            const sisa = Math.max(0, totalDueForPayment - totalPaid);
            const kembalian = Math.max(0, totalPaid - totalDueForPayment);
            summaryGrandTotalEl.textContent = formatNumber(totalDueForPayment);
            summaryPaymentTotalEl.textContent = formatNumber(totalPaid);
            summarySisaEl.textContent = formatNumber(sisa);
            summaryKembalianEl.textContent = formatNumber(kembalian);
            paymentListContainer.innerHTML = payments.map(p => `<div class="text-sm flex justify-between"><span>${p.method}</span><span class="font-semibold">${formatNumber(p.amount)}</span></div>`).join('');
            if (sisa === 0) { confirmPaymentBtn.disabled = false;
                confirmPaymentBtn.classList.remove('opacity-50'); }
            else { confirmPaymentBtn.disabled = true;
                confirmPaymentBtn.classList.add('opacity-50'); }
        }
        
        function openNumpad(method) {
            numpadMethodTitle.textContent = method;
            const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
            const sisa = totalDueForPayment - totalPaid;
            numpadSisaEl.textContent = formatNumber(sisa);
            currentPaymentInput = '0';
            updateNumpadDisplay();
            numpadModal.classList.remove('hidden');
            numpadModal.classList.add('flex');
            setTimeout(() => { numpadModal.querySelector('.modal-content').classList.remove('translate-y-full'); }, 10);
        }
        
        function closeNumpad() {
            numpadModal.querySelector('.modal-content').classList.add('translate-y-full');
            setTimeout(() => { numpadModal.classList.add('hidden');
                numpadModal.classList.remove('flex'); }, 300);
        }
        
        function updateNumpadDisplay() { numpadDisplay.value = formatNumber(parseInt(currentPaymentInput || '0')); }
        
        function handleNumpadInput(value) {
            if (/[0-9]/.test(value)) { if (currentPaymentInput === '0') currentPaymentInput = '';
                currentPaymentInput += value; }
            else if (value === 'backspace') { currentPaymentInput = currentPaymentInput.slice(0, -1); if (currentPaymentInput === '') currentPaymentInput = '0'; }
            else if (value === 'clear') { currentPaymentInput = '0'; }
            else if (value === 'sisa') { const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0); const sisa = totalDueForPayment - totalPaid;
                currentPaymentInput = sisa.toString(); }
            else if (value.startsWith('+')) { const amount = parseInt(value.substring(1));
                currentPaymentInput = (parseInt(currentPaymentInput || '0') + amount).toString(); }
            else { currentPaymentInput = value; }
            updateNumpadDisplay();
        }
        
        paymentMainModal.addEventListener('click', e => {
            const methodBtn = e.target.closest('.payment-method-btn');
            if (methodBtn) {
                const method = methodBtn.dataset.method;
                if (method === 'CASH') { openNumpad(method); }
                else { const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0); const sisa = totalDueForPayment - totalPaid; if (sisa > 0) { payments.push({ method: method, amount: sisa });
                        updatePaymentSummary(); } }
            }
        });
        numpadModal.addEventListener('click', e => {
            const numpadBtn = e.target.closest('.numpad-btn');
            if (numpadBtn) handleNumpadInput(numpadBtn.dataset.value);
            else if (e.target.closest('#numpad-tutup-btn')) closeNumpad();
            else if (e.target.closest('#numpad-simpan-btn')) { const amount = parseInt(currentPaymentInput || '0'); if (amount > 0) { payments.push({ method: 'CASH', amount: amount });
                    updatePaymentSummary(); } closeNumpad(); }
        });
        const sidebar = document.getElementById('sidebar');
        const sidebarOverlay = document.getElementById('sidebar-overlay');
        const menuBtn = document.getElementById('menu-btn');
        const tanggalKerjaEl = document.getElementById('tanggal-kerja');
        const bukaNotaAktifBtn = document.getElementById('buka-nota-aktif');
        const notaAktifBtn = document.getElementById('nota-aktif-btn');
        const activeOrdersCountBadge = document.getElementById('active-orders-count-badge');
        const takeAwayContainer = document.getElementById('take-away-container');
        const takeAwayToggle = document.getElementById('take-away-toggle');
        const takeAwayText = document.getElementById('take-away-text');
        const formatRupiah = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num || 0);
        const formatNumber = (num) => new Intl.NumberFormat('id-ID').format(num || 0);
        
        function openSidebar() { sidebarOverlay.classList.remove('hidden');
            sidebar.classList.remove('-translate-x-full');
            setTimeout(() => sidebarOverlay.classList.remove('opacity-0'), 10); }
        
        function closeSidebar() { sidebarOverlay.classList.add('opacity-0');
            sidebar.classList.add('-translate-x-full');
            setTimeout(() => sidebarOverlay.classList.add('hidden'), 300); }
        
        function setTanggalKerja() { const today = new Date(); const options = { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' };
            tanggalKerjaEl.textContent = `Tanggal Kerja : ${today.toLocaleDateString('id-ID', options)}`; }
        menuBtn.addEventListener('click', openSidebar);
        sidebarOverlay.addEventListener('click', closeSidebar);
        notaAktifBtn.addEventListener('click', () => { openModal(activeOrdersModalOverlay);
            renderActiveOrders(); if (activeOrderInterval) clearInterval(activeOrderInterval);
            activeOrderInterval = setInterval(renderActiveOrders, 60000); });
        takeAwayContainer.addEventListener('click', () => { takeAwayToggle.checked = !takeAwayToggle.checked;
            takeAwayToggle.dispatchEvent(new Event('change')); });
        takeAwayToggle.addEventListener('change', () => {
            cart.isTakeAway = takeAwayToggle.checked;
            if (takeAwayToggle.checked) { takeAwayText.textContent = 'Take Away';
                takeAwayText.classList.remove('text-slate-300'); }
            else { takeAwayText.textContent = 'Dine In';
                takeAwayText.classList.add('text-slate-300'); }
        });
        
        function renderProductGrid(itemsToRender) {
            productGrid.innerHTML = '';
            if (itemsToRender.length === 0) { productGrid.innerHTML = `<p class="col-span-full text-center text-gray-500">Produk tidak ditemukan.</p>`; return; }
            itemsToRender.forEach(item => {
                if (!item.isAvailable) return;
                const itemInTempCart = tempCartItems.find(i => i.id === item.id);
                const quantity = itemInTempCart ? itemInTempCart.quantity : 0;
                const card = document.createElement('div');
                card.className = `relative bg-white border rounded-lg shadow-sm flex flex-col p-2 transition-all duration-200 ${quantity > 0 ? 'border-blue-500 ring-2 ring-blue-200' : ''}`;
                card.dataset.id = item.id;
                card.innerHTML = `<div class="product-info-area cursor-pointer"><div class="w-full h-24 bg-cover bg-center rounded-md" style="background-image: url('${item.image || 'https://placehold.co/200x200/e2e8f0/64748b?text=Image'}')"></div><div class="flex-grow flex flex-col pt-2"><p class="font-semibold text-sm leading-tight flex-grow">${item.name}</p><p class="font-bold text-blue-600 mt-1">${formatRupiah(item.price)}</p></div></div><div class="quantity-control-area absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center gap-3 ${quantity > 0 ? '' : 'hidden'}"><button class="modal-quantity-btn w-8 h-8 bg-white text-blue-600 rounded-full font-bold text-lg" data-id="${item.id}" data-change="-1">-</button><span class="quantity-display text-white font-bold text-xl">${quantity}</span><button class="modal-quantity-btn w-8 h-8 bg-white text-blue-600 rounded-full font-bold text-lg" data-id="${item.id}" data-change="1">+</button></div>`;
                card.querySelector('.product-info-area').addEventListener('click', () => { updateTempCart(item.id, 1); });
                productGrid.appendChild(card);
            });
        }
        productGrid.addEventListener('click', e => { if (e.target.classList.contains('modal-quantity-btn')) { const id = e.target.dataset.id; const change = parseInt(e.target.dataset.change);
                updateTempCart(id, change); } });
        // Ganti fungsi updateTempCart yang lama dengan yang ini
        function updateTempCart(itemId, change) {
            const item = allMenuItems.find(m => m.id === itemId);
            if (!item) return;
            
            let existingItem = tempCartItems.find(i => i.id === itemId);
            
            if (existingItem) {
                existingItem.quantity += change;
            } else if (change > 0) {
                // [PERUBAHAN] Ganti properti diskon
                tempCartItems.push({
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    quantity: change,
                    notes: '',
                    discountType: 'fixed', // <-- Tambahkan ini
                    discountValue: 0 // <-- Tambahkan ini
                });
            }
            
            tempCartItems = tempCartItems.filter(i => i.quantity > 0);
            filterAndRenderProducts();
            updateModalSummary();
        }
        
        function updateModalSummary() { const totalItems = tempCartItems.reduce((sum, item) => sum + item.quantity, 0); const totalPrice = tempCartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            modalItemCountEl.textContent = formatNumber(totalItems);
            modalTotalPriceEl.textContent = formatRupiah(totalPrice); }
        
        function renderCategoryFilters() {
            const categories = ['Semua', ...new Set(allMenuItems.map(item => item.category))];
            categoryFilterContainer.innerHTML = '';
            categories.forEach(cat => {
                const btn = document.createElement('button');
                btn.className = 'px-4 py-1.5 text-sm font-semibold border rounded-full whitespace-nowrap transition-colors';
                if (cat === 'Semua') btn.classList.add('bg-gray-800', 'text-white');
                btn.textContent = cat;
                btn.dataset.category = cat;
                btn.addEventListener('click', (e) => { document.querySelectorAll('#category-filter-container button').forEach(button => button.classList.remove('bg-gray-800', 'text-white'));
                    e.currentTarget.classList.add('bg-gray-800', 'text-white');
                    filterAndRenderProducts(); });
                categoryFilterContainer.appendChild(btn);
            });
        }
        
        function filterAndRenderProducts() { const activeCategory = document.querySelector('#category-filter-container button.bg-gray-800')?.dataset.category || 'Semua'; const searchTerm = searchInput.value.toLowerCase(); const filtered = allMenuItems.filter(item => (activeCategory === 'Semua' || item.category === activeCategory) && item.name.toLowerCase().includes(searchTerm));
            renderProductGrid(filtered); }
        searchInput.addEventListener('input', filterAndRenderProducts);
        
        function updateCartItem(itemId, change) { const item = cart.items.find(i => i.id === itemId); if (!item) return;
            item.quantity += change; if (item.quantity <= 0) cart.items = cart.items.filter(i => i.id !== itemId);
            renderOrder(); }
        
        // Ganti fungsi calculateTotals yang lama dengan yang ini
        // GANTI FUNGSI calculateTotals YANG LAMA DENGAN INI
        function calculateTotals(items = cart.items) {
            let sub = 0;
            let totalItemDiscounts = 0;
            
            // Hitung subtotal dan diskon per item
            items.forEach(item => {
                const itemSubtotal = item.price * item.quantity;
                sub += itemSubtotal;
                
                if (item.discountType === 'percent') {
                    totalItemDiscounts += itemSubtotal * (item.discountValue / 100);
                } else { // 'fixed'
                    totalItemDiscounts += item.discountValue || 0;
                }
            });
            
            let finalDiscountAmount = totalItemDiscounts;
            
            // Logika untuk diskon global (hanya berlaku jika tidak ada diskon per item)
            if (totalItemDiscounts === 0) {
                if (cart.promo && cart.promo.type === 'discount') {
                    finalDiscountAmount = sub * (cart.promo.value / 100);
                } else if (cart.discountType === 'percent') {
                    finalDiscountAmount = sub * (cart.discountValue / 100);
                } else {
                    finalDiscountAmount = cart.discountValue || 0;
                }
            }
            
            const subAfterDiscount = sub - finalDiscountAmount;
            const tax = cart.taxEnabled ? subAfterDiscount * 0.10 : 0;
            const total = subAfterDiscount + tax;
            const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);
            
            return { sub, tax, total, totalItems, discountAmount: finalDiscountAmount };
        }
        
        // GANTI FUNGSI LAMA ANDA DENGAN YANG INI
        function renderOrder() {
            emptyCartMsg.style.display = cart.items.length === 0 ? 'flex' : 'none';
            orderItemsContainer.innerHTML = ''; // Kosongkan dulu
            
            cart.items.forEach(item => {
                const itemDiv = document.createElement('div');
                // Tambahkan class 'item-row' untuk identifikasi klik
                itemDiv.className = 'grid grid-cols-12 gap-2 px-4 py-3 border-b items-center item-row cursor-pointer';
                itemDiv.dataset.id = item.id; // Tambahkan data-id ke baris utama
                
                // Cek apakah item ini yang sedang dipilih
                if (item.id === selectedItemId) {
                    // Tampilan jika item DIPILIH (expanded view)
                    itemDiv.classList.add('bg-yellow-100');
                    itemDiv.classList.remove('cursor-pointer');
                    
                    itemDiv.innerHTML = `
                <div class="col-span-12 font-medium text-sm mb-2">${escapeHTML(item.name)}</div>
                <div class="col-span-12 flex justify-between items-center">
                    <div class="flex gap-2">
                        <button class="delete-btn flex items-center gap-2 px-3 py-1 bg-white border rounded-md text-red-600 font-semibold text-xs" data-id="${item.id}"><i class="fas fa-trash"></i> Hapus</button>
                        <button class="edit-btn flex items-center gap-2 px-3 py-1 bg-white border rounded-md text-gray-700 font-semibold text-xs" data-id="${item.id}"><i class="fas fa-pencil-alt"></i> Ubah</button>
                    </div>
                    <div class="flex items-center gap-3">
                        <button class="quantity-btn w-7 h-7 bg-white border rounded-full font-bold text-lg" data-id="${item.id}" data-change="-1">-</button>
                        <span class="font-bold text-lg">${item.quantity}</span>
                        <button class="quantity-btn w-7 h-7 bg-white border rounded-full font-bold text-lg" data-id="${item.id}" data-change="1">+</button>
                    </div>
                </div>
            `;
                } else {
                    // Tampilan jika item TIDAK dipilih (normal view)
                    itemDiv.innerHTML = `
                <div class="col-span-2 font-medium">${item.quantity}</div>
                <div class="col-span-6 font-medium text-sm">${escapeHTML(item.name)}</div>
                <div class="col-span-4 text-right font-semibold">${formatNumber(item.price * item.quantity)}</div>
            `;
                }
                orderItemsContainer.appendChild(itemDiv);
            });
            
            const { total, totalItems, discountAmount } = calculateTotals();
            
            if (discountAmount > 0) {
                let discountLabel = 'Diskon';
                if (cart.promo) {
                    discountLabel = `Diskon (${escapeHTML(cart.promo.name)})`;
                } else if (cart.discountType === 'percent') {
                    discountLabel = `Diskon (${cart.discountValue}%)`;
                }
                const discountDiv = document.createElement('div');
                discountDiv.className = 'grid grid-cols-12 gap-2 px-4 py-2 text-sm text-red-500';
                discountDiv.innerHTML = `<div class="col-span-8 font-semibold">${discountLabel}</div><div class="col-span-4 text-right font-bold">-${formatNumber(discountAmount)}</div>`;
                orderItemsContainer.appendChild(discountDiv);
            }
            
            totalProdukEl.textContent = totalItems;
            grandTotalEl.textContent = formatRupiah(total);
            payBtn.textContent = `Bayar ${formatRupiah(total)}`;
            
            if (cart.shortId) {
                notaIdEl.textContent = `ID Nota #${cart.shortId}`;
            } else if (cart.tableName) {
                notaIdEl.textContent = `Meja ${cart.tableName}`;
            } else {
                notaIdEl.textContent = 'Nota Baru';
            }
            
            customerNameDisplay.textContent = cart.customerName;
        }
        
        // GANTI DENGAN FUNGSI BARU INI
        function openTransaksiView() {
            transaksiView.classList.remove('translate-x-full');
        }
        
        function closeTransaksiView() {
            transaksiView.classList.add('translate-x-full');
        }
        // [BARU] Fungsi untuk halaman Transaksi Harian
        function openTransaksiHarianView() {
            // Tampilkan tanggal hari ini saat dibuka
            const today = new Date();
            thDatepickerBtn.textContent = today.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
            
            renderTransaksiHarian(today); // Muat data untuk hari ini
            transaksiHarianView.classList.remove('translate-x-full');
        }
        
        function closeTransaksiHarianView() {
            transaksiHarianView.classList.add('translate-x-full');
        }
        
        async function renderTransaksiHarian() {
            transaksiHarianList.innerHTML = '<div class="p-8 text-center text-gray-500">Memuat data...</div>';
            
            // Gunakan state global thCurrentDate
            const startOfDay = new Date(thCurrentDate);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(thCurrentDate);
            endOfDay.setHours(23, 59, 59, 999);
            
            // Buat dasar query
            let queryConstraints = [
                where("timestamp", ">=", startOfDay),
                where("timestamp", "<=", endOfDay)
            ];
            
            // Tambahkan filter status JIKA bukan "Semua status"
            if (thCurrentStatus && thCurrentStatus !== 'Semua status') {
                queryConstraints.push(where("status", "==", thCurrentStatus));
            }
            
            // Tambahkan pengurutan berdasarkan waktu
            queryConstraints.push(orderBy("timestamp", "desc"));
            
            const q = query(collection(db, "orders"), ...queryConstraints);
            
            const querySnapshot = await getDocs(q);
            let transactionsHtml = '';
            
            if (querySnapshot.empty) {
                transaksiHarianList.innerHTML = '<div class="p-8 text-center text-gray-500">Tidak ada transaksi ditemukan.</div>';
                transaksiHarianCount.textContent = 0;
                return;
            }
            
            querySnapshot.forEach(doc => {
                const order = { id: doc.id, ...doc.data() };
                const statusClass = order.status === 'Selesai' ? 'bg-yellow-100' : 'bg-white';
                const displayId = order.shortId || order.id.substring(0, 4).toUpperCase();
                const displayFullId = order.fullId || order.id;
                transactionsHtml += `
<div class="th-item-clickable grid grid-cols-12 gap-2 px-4 py-3 border-b items-center text-sm ${statusClass} cursor-pointer hover:bg-gray-200" data-id="${order.id}">
               <div class="col-span-5">
                    <p class="font-bold">${displayId}</p>
                    <p class="text-xs text-gray-500">${displayFullId}</p>
                </div>
                <div class="col-span-4 text-right font-semibold">${formatNumber(order.total)}</div>
                <div class="col-span-3 text-center font-semibold text-gray-700">${order.status}</div>
            </div>
        `;
            });
            
            transaksiHarianList.innerHTML = transactionsHtml;
            transaksiHarianCount.textContent = querySnapshot.size;
        }
        
        function openDiskonPajakModal() {
            const { sub } = calculateTotals();
            dpSubtotal.textContent = formatRupiah(sub);
            
            if (cart.discountType === 'percent') {
                dpDiskonPercent.value = cart.discountValue;
                dpDiskonFixed.value = 0;
                dpDiskonSlider.style.transform = 'translateX(100%)';
                dpDiskonBtnPercent.classList.remove('text-gray-500');
                dpDiskonBtnFixed.classList.add('text-gray-500');
                dpDiskonPercent.classList.remove('bg-gray-100');
                dpDiskonFixed.classList.add('bg-gray-100');
            } else {
                dpDiskonFixed.value = cart.discountValue;
                dpDiskonPercent.value = 0;
                dpDiskonSlider.style.transform = 'translateX(0%)';
                dpDiskonBtnFixed.classList.remove('text-gray-500');
                dpDiskonBtnPercent.classList.add('text-gray-500');
                dpDiskonFixed.classList.remove('bg-gray-100');
                dpDiskonPercent.classList.add('bg-gray-100');
            }
            
            updatePajakField();
            openModal(diskonPajakOverlay);
        }
        
        function clearOrder() { cart = { id: null, items: [], customerName: 'Umum', guestCount: 1, notes: '', isTakeAway: false };
            lastSuccessfulOrder = null;
            takeAwayToggle.checked = false;
            takeAwayToggle.dispatchEvent(new Event('change'));
            renderOrder(); }
        // GANTI BLOK EVENT LISTENER LAMA DENGAN YANG BARU INI
        // GANTI event listener orderItemsContainer yang lama dengan yang ini
        orderItemsContainer.addEventListener('click', (e) => {
            const target = e.target;
            const quantityBtn = target.closest('.quantity-btn');
            const deleteBtn = target.closest('.delete-btn');
            const editBtn = target.closest('.edit-btn'); // <-- Perubahan di sini
            const itemRow = target.closest('.item-row');
            
            if (quantityBtn) {
                updateCartItem(quantityBtn.dataset.id, parseInt(quantityBtn.dataset.change));
            } else if (deleteBtn) {
                if (confirm('Anda yakin ingin menghapus item ini dari pesanan?')) {
                    const itemId = deleteBtn.dataset.id;
                    cart.items = cart.items.filter(i => i.id !== itemId);
                    selectedItemId = null;
                    renderOrder();
                }
            } else if (editBtn) {
                // [PERUBAHAN] Panggil modal, bukan alert
                openEditItemModal(editBtn.dataset.id);
            } else if (itemRow) {
                const itemId = itemRow.dataset.id;
                selectedItemId = selectedItemId === itemId ? null : itemId;
                renderOrder();
            }
        });
        
        // [BARU] Tambahkan event listener untuk tombol-tombol di dalam modal
        // GANTI event listener 'editItemOverlay' yang lama dengan yang baru ini
        editItemOverlay.addEventListener('click', (e) => {
            const target = e.target;
            const item = cart.items.find(i => i.id === editingItemId);
            if (!item) return;
            
            // Logika Tombol Tutup & Simpan
            if (target.id === 'edit-item-close-btn') {
                closeEditItemModal();
            }
            if (target.id === 'edit-item-save-btn') {
                item.quantity = parseInt(editItemQuantity.value) || 1;
                
                if (item.discountType === 'percent') {
                    item.discountValue = parseFloat(editItemDiscountPercent.value) || 0;
                } else {
                    item.discountValue = parseFloat(editItemDiscountFixed.value) || 0;
                }
                
                item.notes = editItemNotes.value.trim();
                
                closeEditItemModal();
                renderOrder();
            }
            // Logika Tombol +/-
            if (target.id === 'edit-item-plus') {
                editItemQuantity.value = parseInt(editItemQuantity.value) + 1;
            }
            if (target.id === 'edit-item-minus') {
                const currentQty = parseInt(editItemQuantity.value);
                if (currentQty > 1) {
                    editItemQuantity.value = currentQty - 1;
                }
            }
            // Logika Toggle Diskon
            if (target.id === 'edit-item-discount-btn-fixed') {
                item.discountType = 'fixed'; // Simpan tipe sementara
                editItemDiskonSlider.style.transform = 'translateX(0%)';
                editItemDiscountFixed.readOnly = false;
                editItemDiscountPercent.readOnly = true;
                editItemDiscountPercent.value = 0;
            }
            if (target.id === 'edit-item-discount-btn-percent') {
                item.discountType = 'percent'; // Simpan tipe sementara
                editItemDiskonSlider.style.transform = 'translateX(100%)';
                editItemDiscountPercent.readOnly = false;
                editItemDiscountFixed.readOnly = true;
                editItemDiscountFixed.value = 0;
            }
        });
        
        // [BARU] Tambahkan event listener untuk input persen agar otomatis menghitung
        editItemDiscountPercent.addEventListener('input', () => {
            const item = cart.items.find(i => i.id === editingItemId);
            if (!item) return;
            const percent = parseFloat(editItemDiscountPercent.value) || 0;
            const qty = parseInt(editItemQuantity.value) || 1;
            editItemDiscountFixed.value = Math.round((item.price * qty) * (percent / 100));
        });
        cancelBtn.addEventListener('click', async () => {
            if (!cart.id) { if (confirm('Yakin membatalkan nota baru ini?')) { clearOrder(); } return; }
            if (confirm(`Yakin ingin MENGHAPUS Nota #${cart.id.substring(0,6).toUpperCase()} secara permanen? Tindakan ini tidak dapat diurungkan.`)) { try { await deleteDoc(doc(db, "orders", cart.id));
                    alert('Nota berhasil dihapus.');
                    clearOrder(); } catch (e) { console.error("Gagal menghapus nota: ", e);
                    alert("Terjadi kesalahan saat menghapus nota. Silakan coba lagi."); } }
        });
        const openModal = (overlay) => { overlay.classList.remove('hidden');
            overlay.classList.add('flex');
            setTimeout(() => overlay.querySelector('.modal-content')?.classList.remove('scale-95', 'opacity-0'), 10); };
        const closeModal = (overlay) => { overlay.querySelector('.modal-content')?.classList.add('scale-95', 'opacity-0');
            setTimeout(() => { overlay.classList.add('hidden');
                overlay.classList.remove('flex'); if (overlay === activeOrdersModalOverlay && activeOrderInterval) { clearInterval(activeOrderInterval); } }, 300); };
        document.getElementById('add-product-btn').addEventListener('click', () => { tempCartItems = JSON.parse(JSON.stringify(cart.items));
            updateModalSummary();
            filterAndRenderProducts();
            openModal(productModalOverlay); });
        document.getElementById('close-product-modal-btn').addEventListener('click', () => closeModal(productModalOverlay));
        confirmAddProductBtn.addEventListener('click', () => { cart.items = tempCartItems;
            renderOrder();
            closeModal(productModalOverlay); });
        openChargeBtn.addEventListener('click', () => { openChargeNameInput.value = '';
            openChargePriceInput.value = '';
            openModal(openChargeModalOverlay); });
        cancelOpenChargeBtn.addEventListener('click', () => closeModal(openChargeModalOverlay));
        confirmOpenChargeBtn.addEventListener('click', () => { const name = openChargeNameInput.value.trim(); const price = parseInt(openChargePriceInput.value); if (!name || isNaN(price) || price <= 0) { alert('Nama item dan harga valid harus diisi.'); return; } const openChargeItem = { id: `oc_${Date.now()}`, name: name, price: price, quantity: 1 };
            tempCartItems.push(openChargeItem);
            updateModalSummary();
            closeModal(openChargeModalOverlay); });
        document.getElementById('close-payment-modal-btn').addEventListener('click', () => closeModal(paymentModalOverlay));
        // KODE BARU
        bukaNotaAktifBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openTransaksiView(); // Buka halaman transaksi
            closeSidebar(); // Tutup sidebar
        });
        transaksiBackBtn.addEventListener('click', closeTransaksiView);
        document.getElementById('close-active-orders-btn').addEventListener('click', () => closeModal(activeOrdersModalOverlay));
        saveBtn.addEventListener('click', async () => {
            if (cart.items.length === 0) { alert("Keranjang kosong!"); return; }
            if (!confirm('Simpan nota ini ke Nota Aktif?')) return;
            const { sub, tax, total } = calculateTotals();
            
            // **PERBAIKAN: Panggil fungsi generator ID di sini**
            const { shortId, fullId } = await generateNewNotaId();
            
            const orderData = {
                // **PERBAIKAN: Tambahkan ID baru ke data yang akan disimpan**
                shortId: shortId,
                fullId: fullId,
                items: cart.items,
                subtotal: sub,
                tax: tax,
                total: total,
                customerName: cart.customerName,
                isTakeAway: takeAwayToggle.checked,
                guestCount: cart.guestCount,
                notes: cart.notes,
                status: 'Aktif',
                timestamp: serverTimestamp(),
                tableName: cart.tableName || null
            };
            try {
                if (cart.id) {
                    await updateDoc(doc(db, "orders", cart.id), orderData);
                } else {
                    await addDoc(collection(db, "orders"), orderData);
                }
                alert('Nota berhasil disimpan!');
                clearOrder();
            }
            catch (e) { console.error("Error saving order: ", e);
                alert("Gagal menyimpan nota."); }
        });
        
        function openNotaDetailModal() { detailTamuInput.value = cart.customerName;
            detailTamuCount.value = cart.guestCount;
            detailCatatan.value = cart.notes; const tipe = takeAwayToggle.checked ? 'Take Away' : 'Dine In';
            detailTipeTransaksi.textContent = tipe;
            openModal(notaDetailModalOverlay); }
        notaBaruBtn.addEventListener('click', openNotaDetailModal);
        closeNotaDetailBtn.addEventListener('click', () => closeModal(notaDetailModalOverlay));
        saveNotaDetailBtn.addEventListener('click', () => { const newCustomerName = detailTamuInput.value.trim() || 'Umum'; const newGuestCount = parseInt(detailTamuCount.value) || 1; const newNotes = detailCatatan.value.trim();
            cart.customerName = newCustomerName;
            cart.guestCount = newGuestCount;
            cart.notes = newNotes;
            renderOrder();
            closeModal(notaDetailModalOverlay); });
        detailTamuPlus.addEventListener('click', () => { detailTamuCount.value = parseInt(detailTamuCount.value) + 1; });
        detailTamuMinus.addEventListener('click', () => { let count = parseInt(detailTamuCount.value); if (count > 1) { detailTamuCount.value = count - 1; } });
        daftarMejaBtn.addEventListener('click', () => { openModal(daftarMejaModalOverlay); });
        closeDaftarMejaBtn.addEventListener('click', () => { closeModal(daftarMejaModalOverlay); });
        
        function openAreaMejaModal() {
            areaMejaOptions.forEach(opt => { const area = opt.dataset.area; if (area === currentAreaMeja) { opt.classList.add('font-semibold', 'text-blue-600', 'border-l-4', 'border-blue-600', 'bg-blue-50'); } else { opt.classList.remove('font-semibold', 'text-blue-600', 'border-l-4', 'border-blue-600', 'bg-blue-50'); } });
            areaMejaOverlay.classList.remove('hidden');
            areaMejaModal.classList.remove('translate-y-full');
        }
        
        function closeAreaMejaModal() { areaMejaOverlay.classList.add('hidden');
            areaMejaModal.classList.add('translate-y-full'); }
        areaUtamaBtn.addEventListener('click', openAreaMejaModal);
        areaMejaOverlay.addEventListener('click', closeAreaMejaModal);
        areaMejaOptions.forEach(option => { option.addEventListener('click', () => { const selectedArea = option.dataset.area;
                currentAreaMeja = selectedArea;
                areaUtamaDisplay.textContent = selectedArea;
                closeAreaMejaModal();
                renderTables(); }); });
        
        function openMejaStatusModal() {
            mejaStatusOptions.forEach(opt => { const status = opt.dataset.status; if (status === currentMejaStatus) { opt.classList.add('font-semibold', 'text-blue-600', 'border-l-4', 'border-blue-600', 'bg-blue-50'); } else { opt.classList.remove('font-semibold', 'text-blue-600', 'border-l-4', 'border-blue-600', 'bg-blue-50'); } });
            mejaStatusOverlay.classList.remove('hidden');
            mejaStatusModal.classList.remove('translate-y-full');
        }
        
        function closeMejaStatusModal() { mejaStatusOverlay.classList.add('hidden');
            mejaStatusModal.classList.add('translate-y-full'); }
        mejaTerisiBtn.addEventListener('click', openMejaStatusModal);
        mejaStatusOverlay.addEventListener('click', closeMejaStatusModal);
        mejaStatusOptions.forEach(option => { option.addEventListener('click', () => { const selectedStatus = option.dataset.status;
                currentMejaStatus = selectedStatus;
                mejaTerisiDisplay.textContent = selectedStatus;
                closeMejaStatusModal();
                renderTables(); }); });
        
        function renderTables() {
            if (!tablesGridContainer) return;
            const occupiedTableNames = activeOrders.map(order => order.tableName).filter(Boolean);
            const filteredTables = allTables.filter(table => {
                let isInArea = false;
                if (currentAreaMeja === 'Area Bebas') isInArea = true;
                else isInArea = table.area === currentAreaMeja;
                const isOccupied = occupiedTableNames.includes(table.nama);
                let matchStatus = false;
                if (currentMejaStatus === 'Semua') matchStatus = true;
                else if (currentMejaStatus === 'Meja Terisi') matchStatus = isOccupied;
                else if (currentMejaStatus === 'Meja Kosong') matchStatus = !isOccupied;
                return isInArea && matchStatus;
            });
            tablesGridContainer.innerHTML = '';
            if (filteredTables.length === 0) {
                tablesGridContainer.innerHTML = `<div class="col-span-2 text-center text-gray-500 py-10 flex flex-col items-center justify-center h-full"><i class="fas fa-chair fa-3x"></i><p class="mt-4 font-semibold">Tidak ada meja yang sesuai.</p></div>`;
                return;
            }
            const grid = document.createElement('div');
            grid.className = 'grid grid-cols-2 gap-3 text-center';
            filteredTables.forEach(table => {
                const isOccupied = occupiedTableNames.includes(table.nama);
                const card = document.createElement('div');
                card.className = `table-card p-6 rounded-lg shadow-sm border cursor-pointer transition-colors`;
                card.dataset.tableName = table.nama;
                if (isOccupied) { card.classList.add('bg-green-100', 'border-green-400', 'hover:bg-green-200');
                    card.innerHTML = `<p class="font-bold text-2xl text-green-800">${table.nama}</p><p class="text-xs font-semibold text-green-700">Terisi</p>`; }
                else { card.classList.add('bg-white', 'hover:bg-gray-100');
                    card.innerHTML = `<p class="font-bold text-2xl text-gray-700">${table.nama}</p>`; }
                grid.appendChild(card);
            });
            tablesGridContainer.appendChild(grid);
        }
        tablesGridContainer.addEventListener('click', (e) => {
            const card = e.target.closest('.table-card');
            if (!card) return;
            const tableName = card.dataset.tableName;
            const isOccupied = card.querySelector('p').classList.contains('text-green-800');
            if (isOccupied) {
                const orderToLoad = activeOrders.find(order => order.tableName === tableName);
                if (orderToLoad) {
                    cart = { id: orderToLoad.id, items: orderToLoad.items, customerName: orderToLoad.customerName, guestCount: orderToLoad.guestCount || 1, notes: orderToLoad.notes || '', isTakeAway: orderToLoad.isTakeAway, tableName: orderToLoad.tableName };
                    takeAwayToggle.checked = cart.isTakeAway;
                    takeAwayToggle.dispatchEvent(new Event('change'));
                    renderOrder();
                    closeModal(daftarMejaModalOverlay);
                } else { alert(`Error: Tidak ditemukan nota aktif untuk meja ${tableName}.`); }
            } else {
                if (cart.items.length > 0) { if (!confirm('Anda memiliki item di keranjang. Buat nota baru untuk meja ini akan menghapus keranjang saat ini. Lanjutkan?')) { return; } }
                clearOrder();
                cart.tableName = tableName;
                cart.customerName = `Meja ${tableName}`;
                renderOrder();
                closeModal(daftarMejaModalOverlay);
            }
        });
        
        function calculateDuration(startDate) {
            if (!startDate) return { text: '...', totalMinutes: 0 };
            const now = new Date();
            const diffMs = now - startDate;
            const totalMinutes = Math.floor(diffMs / 60000);
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            let text = '';
            if (hours > 0) text += `${hours} Jam `;
            text += `${minutes} Menit`;
            return { text, totalMinutes };
        }
        // GANTI FUNGSI LAMA DENGAN INI
        function renderActiveOrders() {
            const listEl = document.getElementById('active-orders-list');
            const trxCountEl = document.getElementById('active-orders-trx-count');
            activeOrdersCountBadge.textContent = activeOrders.length;
            trxCountEl.textContent = activeOrders.length;
            
            if (activeOrders.length === 0) {
                listEl.innerHTML = `<p class="text-center text-gray-500 py-10">Tidak ada nota aktif.</p>`;
                return;
            }
            
            const sortedOrders = [...activeOrders].sort((a, b) => (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0));
            listEl.innerHTML = sortedOrders.map(order => {
                const orderDate = order.timestamp?.toDate();
                const { text: durationText, totalMinutes } = calculateDuration(orderDate);
                const durationClass = totalMinutes > 120 ? 'bg-red-200 text-red-800' : 'bg-yellow-200 text-yellow-800';
                
                const displayId = order.shortId || order.id.substring(0, 4).toUpperCase();
                const displayFullId = order.fullId || order.id;
                const title = order.isTakeAway ? `Take Away #${displayId}` : `Nota #${displayId}`;
                
                // AMANKAN NAMA PELANGGAN DENGAN escapeHTML
                return `<div class="active-order-card bg-white border rounded-lg p-3 shadow-sm cursor-pointer hover:bg-gray-50" data-id="${order.id}">
                    <div class="text-center mb-2">
                        <p class="font-bold text-lg">${title}</p>
                        <p class="text-xs text-gray-500">${displayFullId}</p> 
                    </div>
                    <div class="text-xs text-gray-600 space-y-1 mb-3">
                        <div class="flex justify-between">
                            <span>Tanggal: ${orderDate ? orderDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '...'}</span>
                            <span>Jam: ${orderDate ? orderDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '...'}</span>
                        </div>
                        <div><span>Tamu: ${escapeHTML(order.customerName)}</span></div>
                    </div>
                    <div class="text-center mb-2">
                        <span class="inline-block px-3 py-1 text-sm font-semibold rounded-md ${durationClass}">Total Durasi : ${durationText}</span>
                    </div>
                    <div class="text-center font-bold text-xl">
                        <span>Total : ${formatRupiah(order.total)}</span>
                    </div>
                </div>`;
            }).join('');
        }
        // --- FUNGSI & LOGIKA UNTUK PROMO ---
        
        // Data dummy untuk promo (nantinya bisa diambil dari database)
        function fetchPromos() {
            availablePromos = [
                { id: 'promo-1', name: 'Diskon 10%', type: 'discount', value: 10 },
                { id: 'promo-2', name: 'Diskon 15%', type: 'discount', value: 15 },
                { id: 'promo-3', name: 'Diskon 20%', type: 'discount', value: 20 },
                { id: null, name: 'Tidak Pakai Promo', type: 'none' } // Opsi default
            ];
            renderPromoList();
        }
        
        function renderPromoList() {
            promoListContainer.innerHTML = '';
            if (availablePromos.length === 0) {
                promoListContainer.innerHTML = '<div class="p-4 text-center text-gray-500">Tidak ada promo tersedia.</div>';
                return;
            }
            
            availablePromos.forEach(promo => {
                const isSelected = promo.id === selectedPromoId;
                const button = document.createElement('button');
                button.className = `promo-option w-full text-left p-4 text-gray-700 hover:bg-gray-200 flex justify-between items-center ${isSelected ? 'font-semibold text-blue-600 border-l-4 border-blue-600 bg-blue-50' : ''}`;
                button.dataset.id = promo.id;
                
                button.innerHTML = `
                    <span>${promo.name}</span>
                    ${isSelected ? '<i class="fas fa-check-circle text-blue-600"></i>' : ''}
                `;
                
                button.addEventListener('click', () => {
                    selectedPromoId = promo.id;
                    renderPromoList(); // Render ulang untuk menunjukkan item yang dipilih
                });
                
                promoListContainer.appendChild(button);
            });
        }
        
        function openPromoModal() {
            fetchPromos(); // Ambil data promo terbaru setiap kali modal dibuka
            promoOverlay.classList.remove('hidden');
            promoModal.classList.remove('translate-y-full');
        }
        
        function closePromoModal() {
            promoOverlay.classList.add('hidden');
            promoModal.classList.add('translate-y-full');
        }
        
        // --- Event Listeners untuk Promo ---
        promoBtn.addEventListener('click', () => {
            if (cart.items.length === 0) {
                alert('Keranjang kosong. Tambahkan produk sebelum memilih promo.');
                return;
            }
            openPromoModal();
        });
        
        
        promoOverlay.addEventListener('click', closePromoModal);
        promoCloseBtn.addEventListener('click', closePromoModal);
        
        // KODE BARU
        promoSelectBtn.addEventListener('click', () => {
            const selected = availablePromos.find(p => p.id === selectedPromoId);
            
            // PERBAIKAN: Selalu reset diskon manual saat memilih/mengubah promo
            cart.discountType = 'percent';
            cart.discountValue = 0;
            
            if (selected && selected.id) {
                // Jika promo dipilih, simpan datanya
                cart.promo = {
                    id: selected.id,
                    name: selected.name,
                    type: selected.type,
                    value: selected.value
                };
            } else {
                // Jika "Tidak Pakai Promo" dipilih, hapus promonya
                delete cart.promo;
            }
            
            renderOrder();
            closePromoModal();
        });
        document.getElementById('active-orders-list').addEventListener('click', (e) => {
            const card = e.target.closest('.active-order-card');
            if (card) {
                const orderId = card.dataset.id;
                const orderToLoad = activeOrders.find(o => o.id === orderId);
                if (orderToLoad) {
                    cart = {
                        id: orderToLoad.id,
                        items: orderToLoad.items,
                        customerName: orderToLoad.customerName,
                        guestCount: orderToLoad.guestCount || 1,
                        notes: orderToLoad.notes || '',
                        isTakeAway: orderToLoad.isTakeAway,
                        // **PASTIKAN BARIS INI DITAMBAHKAN**
                        shortId: orderToLoad.shortId,
                        fullId: orderToLoad.fullId
                    };
                    takeAwayToggle.checked = cart.isTakeAway;
                    takeAwayToggle.dispatchEvent(new Event('change'));
                    renderOrder();
                    closeModal(activeOrdersModalOverlay);
                }
            }
        });
        onSnapshot(collection(db, "menu"), (snapshot) => {
            allMenuItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            allMenuItems.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
            filterAndRenderProducts();
            renderCategoryFilters();
        });
        onSnapshot(query(collection(db, "orders"), where("status", "==", "Aktif"), orderBy("timestamp", "desc")), (snapshot) => {
            activeOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderActiveOrders();
            renderTables();
            activeOrdersCountBadge.textContent = activeOrders.length;
        }, (error) => {
            console.error("Firebase query error:", error);
            document.getElementById('active-orders-list').innerHTML = `<div class="text-center text-red-500 p-4">Gagal memuat data.</div>`;
        });
        
        onSnapshot(query(collection(db, "meja"), orderBy("nama")), (snapshot) => {
            allTables = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderTables();
        }, (error) => {
            console.error("Gagal mengambil data meja:", error);
            tablesGridContainer.innerHTML = `<div class="col-span-2 text-center text-red-500 py-10">Gagal memuat data meja.</div>`;
        });
        // =======================================================================
        // =================== LOGIKA RINGKASAN PENJUALAN ======================
        // =======================================================================
        
        // --- Deklarasi Elemen DOM ---
        const summaryView = document.getElementById('summary-view');
        const summaryBackBtn = document.getElementById('summary-back-btn');
        const laporanRingkasanPenjualanBtn = document.getElementById('laporan-ringkasan-penjualan');
        const summaryDatepickerBtn = document.getElementById('summary-datepicker-btn');
        const summaryContentArea = document.getElementById('summary-content-area');
        const summaryTextContent = document.getElementById('summary-text-content');
        const summaryPrintBtn = document.getElementById('summary-print-btn');
        
        let summaryCurrentDate = new Date(); // State untuk tanggal ringkasan
        
        // --- Fungsi untuk membuka & menutup halaman ---
        function openSummaryView() {
            summaryDatepickerBtn.textContent = summaryCurrentDate.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
            generateSalesSummary();
            summaryView.classList.remove('translate-x-full');
        }
        
        function closeSummaryView() {
            summaryView.classList.add('translate-x-full');
        }
        
        
        // --- Fungsi Utama untuk Membuat Ringkasan ---
        async function generateSalesSummary() {
            summaryTextContent.textContent = 'Menghitung data penjualan...';
            
            const startOfDay = new Date(summaryCurrentDate);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(summaryCurrentDate);
            endOfDay.setHours(23, 59, 59, 999);
            
            const q = query(
                collection(db, "orders"),
                where("timestamp", ">=", startOfDay),
                where("timestamp", "<=", endOfDay)
            );
            
            try {
                const querySnapshot = await getDocs(q);
                if (querySnapshot.empty) {
                    summaryTextContent.textContent = 'Tidak ada data penjualan untuk tanggal ini.';
                    return;
                }
                
                // Proses kalkulasi data
                let totalPenjualan = 0;
                let totalDiskonProduk = 0; // Di masa depan jika ada diskon per produk
                let totalDiskonNota = 0;
                let totalPajak = 0;
                let notaSelesai = 0;
                let notaVoid = 0;
                let totalTamu = 0;
                let produkTerjual = 0;
                const kategoriProduk = {};
                const tipeTransaksi = {};
                const tipePembayaran = {};
                
                querySnapshot.forEach(doc => {
                    const order = doc.data();
                    
                    if (order.status === 'Void') {
                        notaVoid++;
                        return; // Jangan proses kalkulasi untuk nota void
                    }
                    
                    // Hanya proses nota 'Selesai'
                    if (order.status === 'Selesai') {
                        notaSelesai++;
                        totalPenjualan += order.total;
                        totalDiskonNota += order.discount || 0;
                        totalPajak += order.tax;
                        totalTamu += order.guestCount || 0;
                        
                        order.items.forEach(item => {
                            produkTerjual += item.quantity;
                            const kategori = item.category || 'Lainnya';
                            if (!kategoriProduk[kategori]) {
                                kategoriProduk[kategori] = { count: 0, total: 0 };
                            }
                            kategoriProduk[kategori].count += item.quantity;
                            kategoriProduk[kategori].total += item.price * item.quantity;
                        });
                        
                        const trxType = order.isTakeAway ? 'Take Away' : 'Dine In';
                        if (!tipeTransaksi[trxType]) {
                            tipeTransaksi[trxType] = { count: 0, total: 0 };
                        }
                        tipeTransaksi[trxType].count++;
                        tipeTransaksi[trxType].total += order.total;
                        
                        order.payments.forEach(p => {
                            const paymentMethod = p.method.toUpperCase();
                            if (!tipePembayaran[paymentMethod]) {
                                tipePembayaran[paymentMethod] = { count: 0, total: 0 };
                            }
                            tipePembayaran[paymentMethod].count++;
                            tipePembayaran[paymentMethod].total += p.amount;
                        });
                    }
                });
                
                // --- Buat Tampilan Teks Nota ---
                const tgl = summaryCurrentDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
                const hwId = "839C-30F9-9352-2669"; // Contoh ID
                let summaryString = `Laris Demo store\n`;
                summaryString += `Ringkasan Penjualan\n`;
                summaryString += `Tgl Penjualan : ${tgl}\n`;
                summaryString += `HW ID : ${hwId}\n`;
                summaryString += `================================\n`;
                summaryString += `   Ringkasan Penjualan #1\n`;
                summaryString += `--------------------------------\n`;
                summaryString += `Penjualan Produk`.padEnd(20) + `${formatNumber(totalPenjualan - totalPajak + totalDiskonNota).padStart(12)}\n`;
                summaryString += `Diskon Produk`.padEnd(20) + `${formatNumber(totalDiskonProduk).padStart(12)}\n`;
                summaryString += `--------------------------------\n`;
                summaryString += `Sub Total`.padEnd(20) + `${formatNumber(totalPenjualan - totalPajak + totalDiskonNota).padStart(12)}\n`;
                summaryString += `Diskon Nota`.padEnd(20) + `${formatNumber(totalDiskonNota).padStart(12)}\n`;
                summaryString += `Pajak`.padEnd(20) + `${formatNumber(totalPajak).padStart(12)}\n`;
                summaryString += `================================\n`;
                summaryString += `Total Penjualan`.padEnd(20) + `${formatNumber(totalPenjualan).padStart(12)}\n`;
                summaryString += `================================\n\n`;
                
                summaryString += `================================\n`;
                summaryString += `   Ringkasan Penjualan #2\n`;
                summaryString += `--------------------------------\n`;
                summaryString += `Nota Selesai`.padEnd(25) + `${notaSelesai.toString().padStart(7)}\n`;
                summaryString += `Tot. Tamu`.padEnd(25) + `${totalTamu.toString().padStart(7)}\n`;
                summaryString += `Batal Nota`.padEnd(25) + `0`.padStart(7) + `\n`; // Belum diimplementasikan
                summaryString += `Void Nota`.padEnd(25) + `${notaVoid.toString().padStart(7)}\n`;
                summaryString += `--------------------------------\n`;
                summaryString += `Produk Terjual`.padEnd(25) + `${produkTerjual.toString().padStart(7)}\n`;
                summaryString += `Produk Batal`.padEnd(25) + `0`.padStart(7) + `\n`;
                summaryString += `Diskon Produk`.padEnd(25) + `${formatNumber(totalDiskonProduk).padStart(7)}\n`;
                summaryString += `================================\n\n`;
                
                summaryString += `      Kategori Produk\n`;
                summaryString += `--------------------------------\n`;
                Object.keys(kategoriProduk).forEach(kat => {
                    const data = kategoriProduk[kat];
                    summaryString += `${kat} [${data.count}]`.padEnd(20) + `${formatNumber(data.total).padStart(12)}\n`;
                });
                summaryString += `--------------------------------\n`;
                summaryString += `Total`.padEnd(20) + `${formatNumber(Object.values(kategoriProduk).reduce((sum, k) => sum + k.total, 0)).padStart(12)}\n\n`;
                
                summaryString += `      Tipe Transaksi\n`;
                summaryString += `--------------------------------\n`;
                Object.keys(tipeTransaksi).forEach(tipe => {
                    const data = tipeTransaksi[tipe];
                    summaryString += `${tipe} [${data.count}]`.padEnd(20) + `${formatNumber(data.total).padStart(12)}\n`;
                });
                summaryString += `--------------------------------\n`;
                summaryString += `Total`.padEnd(20) + `${formatNumber(totalPenjualan).padStart(12)}\n\n`;
                
                summaryString += `      Tipe pembayaran\n`;
                summaryString += `--------------------------------\n`;
                Object.keys(tipePembayaran).forEach(tipe => {
                    const data = tipePembayaran[tipe];
                    summaryString += `${tipe} [${data.count}]`.padEnd(20) + `${formatNumber(data.total).padStart(12)}\n`;
                });
                summaryString += `--------------------------------\n`;
                summaryString += `Total`.padEnd(20) + `${formatNumber(Object.values(tipePembayaran).reduce((sum, p) => sum + p.total, 0)).padStart(12)}\n\n`;
                
                summaryTextContent.textContent = summaryString;
                
            } catch (error) {
                console.error("Gagal membuat ringkasan penjualan:", error);
                summaryTextContent.textContent = 'Gagal memuat data. Lihat console untuk detail.';
            }
        }
        
        // --- Fungsi untuk mencetak ringkasan ---
        function printSummary() {
            const content = summaryTextContent.textContent;
            if (!content || content.startsWith('Memuat') || content.startsWith('Tidak ada')) {
                alert("Tidak ada data untuk dicetak.");
                return;
            }
            // Implementasi cetak bluetooth disini. Kita bisa buat fungsi baru.
            printSummaryViaBluetooth(content);
        }
        
        function generateSummaryEscPos(summaryText) {
            const encoder = new TextEncoder();
            const INIT = '\x1B\x40';
            const ALIGN_LEFT = '\x1B\x61\x00';
            const LF = '\x0A';
            const CUT_PAPER = '\x1D\x56\x42\x00';
            
            let commands = INIT + ALIGN_LEFT;
            commands += summaryText;
            commands += LF + LF + LF;
            commands += CUT_PAPER;
            
            return encoder.encode(commands);
        }
        
        async function printSummaryViaBluetooth(summaryText) {
            if (!navigator.bluetooth) {
                alert("Browser tidak mendukung Web Bluetooth.");
                return;
            }
            try {
                console.log('Mencari printer...');
                const device = await navigator.bluetooth.requestDevice({
                    filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }],
                    acceptAllDevices: false,
                });
                console.log('Printer ditemukan:', device.name);
                const server = await device.gatt.connect();
                const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
                const characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');
                
                const data = generateSummaryEscPos(summaryText);
                await characteristic.writeValue(data);
                alert('Ringkasan penjualan berhasil dikirim ke printer!');
            } catch (error) {
                console.error('Gagal mencetak ringkasan:', error);
                alert(`Gagal mencetak: ${error.message}`);
            }
        }
        
        
        // --- Event Listeners ---
        laporanRingkasanPenjualanBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openSummaryView();
        });
        
        summaryBackBtn.addEventListener('click', closeSummaryView);
        summaryPrintBtn.addEventListener('click', printSummary);
        
        // Gunakan datepicker yang sudah ada untuk memilih tanggal
        summaryDatepickerBtn.addEventListener('click', () => {
            datepickerContext = 'summary'; // Atur konteks ke ringkasan
            openThDatepickerModal();
        });
        // =================== LOGIKA BARU UNTUK ORDER ONLINE ====================
        // Fungsi untuk membuka Halaman Dapur
        function openDapurView() {
            dapurView.classList.remove('translate-x-full');
            listenToKitchenOrders(); // Panggil fungsi untuk memuat pesanan
        }
        
        // Fungsi untuk menutup Halaman Dapur
        function closeDapurView() {
            dapurView.classList.add('translate-x-full');
        }
        
        // Listener untuk tombol "Manajemen Dapur" BARU
        bukaDapurBtn.addEventListener('click', (e) => {
            e.preventDefault();
            closeOrderOnlineView(); // Tutup menu perantara
            openDapurView(); // Buka halaman dapur
        });
        
        // Listener untuk tombol kembali dari Halaman Dapur (kembali ke menu perantara)
        dapurBackBtn.addEventListener('click', () => {
            closeDapurView();
            openOrderOnlineView(); // Buka kembali menu perantara
        });
        
        function listenToKitchenOrders() {
            const kitchenStatuses = ["accepted", "dibuat", "diantarkan"];
            const q = query(
                collection(db, "onlineOrders"),
                where("status", "in", kitchenStatuses),
                orderBy("timestamp", "asc")
            );
            
            onSnapshot(q, (snapshot) => {
                // Kosongkan semua kolom sebelum diisi ulang
                kolomBaru.innerHTML = '';
                kolomDisiapkan.innerHTML = '';
                kolomDiantar.innerHTML = '';
                
                if (snapshot.empty) {
                    kolomBaru.innerHTML = '<p class="text-center text-sm text-gray-500 p-4">Tidak ada pesanan.</p>';
                    return;
                }
                
                snapshot.forEach(doc => {
                    const order = { id: doc.id, ...doc.data() };
                    const orderCard = document.createElement('div');
                    orderCard.className = 'bg-white p-3 rounded-md shadow-sm border';
                    
                    let itemsList = order.items.map(item =>
                        `<li>${item.quantity}x ${escapeHTML(item.name)}</li>`
                    ).join('');
                    
                    let actionButton = '';
                    if (order.status === 'accepted') {
                        actionButton = `<button data-id="${order.id}" data-next-status="dibuat" class="w-full mt-3 p-2 bg-blue-500 text-white font-semibold rounded-lg text-sm">Siapkan Pesanan</button>`;
                    } else if (order.status === 'dibuat') {
                        actionButton = `<button data-id="${order.id}" data-next-status="diantarkan" class="w-full mt-3 p-2 bg-yellow-500 text-white font-semibold rounded-lg text-sm">Pesanan Siap</button>`;
                    } else if (order.status === 'diantarkan') {
                        actionButton = `<button data-id="${order.id}" data-next-status="selesai" class="w-full mt-3 p-2 bg-green-500 text-white font-semibold rounded-lg text-sm">Selesaikan</button>`;
                    }
                    
                    orderCard.innerHTML = `
                <div class="border-b pb-2 mb-2">
                    <p class="font-bold text-gray-800">${escapeHTML(order.customerName)}</p>
                    <p class="text-xs text-gray-500">${order.id.substring(0, 8).toUpperCase()}</p>
                </div>
                <ul class="text-sm text-gray-700 list-disc list-inside">${itemsList}</ul>
                ${actionButton}
            `;
                    
                    // Letakkan kartu di kolom yang sesuai
                    if (order.status === 'accepted') {
                        kolomBaru.appendChild(orderCard);
                    } else if (order.status === 'dibuat') {
                        kolomDisiapkan.appendChild(orderCard);
                    } else if (order.status === 'diantarkan') {
                        kolomDiantar.appendChild(orderCard);
                    }
                });
            });
        }
        
        // --- Deklarasi Elemen DOM ---
        const orderOnlineView = document.getElementById('order-online-view');
        const orderOnlineBackBtn = document.getElementById('order-online-back-btn');
        const bukaOrderOnlineBtn = document.getElementById('buka-order-online-btn'); // Menargetkan tombol Order Online di sidebar
        
        // Halaman Terima Pesanan
        const terimaPesananView = document.getElementById('terima-pesanan-view');
        const bukaTerimaPesananBtn = document.getElementById('buka-terima-pesanan-btn');
        const terimaPesananBackBtn = document.getElementById('terima-pesanan-back-btn');
        const pesananOnlineList = document.getElementById('pesanan-online-list');
        
        // Halaman Atur Stok
        const aturStokView = document.getElementById('atur-stok-view');
        const bukaAturStokBtn = document.getElementById('buka-atur-stok-btn');
        const aturStokBackBtn = document.getElementById('atur-stok-back-btn');
        const stokProdukList = document.getElementById('stok-produk-list');
        
        // Modal Input Menu Baru
        const bukaInputMenuBtn = document.getElementById('buka-input-menu-btn');
        const inputMenuOverlay = document.getElementById('input-menu-overlay');
        const cancelInputMenuBtn = document.getElementById('cancel-input-menu-btn');
        const confirmInputMenuBtn = document.getElementById('confirm-input-menu-btn');
        
        // --- Fungsi untuk Navigasi Halaman ---
        
        function openOrderOnlineView() { orderOnlineView.classList.remove('translate-x-full'); }
        
        function closeOrderOnlineView() { orderOnlineView.classList.add('translate-x-full'); }
        
        function openTerimaPesananView() {
            terimaPesananView.classList.remove('translate-x-full');
            listenToOnlineOrders(); // Mulai mendengar pesanan baru saat halaman dibuka
        }
        
        function closeTerimaPesananView() { terimaPesananView.classList.add('translate-x-full'); }
        
        function openAturStokView() {
            aturStokView.classList.remove('translate-x-full');
            renderStokProduk(); // Tampilkan daftar produk saat halaman dibuka
        }
        
        function closeAturStokView() { aturStokView.classList.add('translate-x-full'); }
        
        function openInputMenuModal() { openModal(inputMenuOverlay); }
        
        function closeInputMenuModal() {
            // Mengosongkan form sebelum ditutup
            document.getElementById('input-menu-name').value = '';
            document.getElementById('input-menu-price').value = '';
            document.getElementById('input-menu-category').value = '';
            document.getElementById('input-menu-image').value = '';
            closeModal(inputMenuOverlay);
        }
        
        
        // --- Event Listener untuk Navigasi ---
        bukaOrderOnlineBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openOrderOnlineView();
            closeSidebar();
        });
        orderOnlineBackBtn.addEventListener('click', closeOrderOnlineView);
        
        bukaTerimaPesananBtn.addEventListener('click', (e) => { e.preventDefault();
            openTerimaPesananView(); });
        terimaPesananBackBtn.addEventListener('click', closeTerimaPesananView);
        
        bukaAturStokBtn.addEventListener('click', (e) => { e.preventDefault();
            openAturStokView(); });
        aturStokBackBtn.addEventListener('click', closeAturStokView);
        
        bukaInputMenuBtn.addEventListener('click', (e) => { e.preventDefault();
            openInputMenuModal(); });
        cancelInputMenuBtn.addEventListener('click', closeInputMenuModal);
        
        
        // --- Logika Fitur 1: Terima Pesanan Online ---
        
        // Fungsi ini akan mendengarkan pesanan baru dari koleksi 'onlineOrders'
        function listenToOnlineOrders() {
            pesananOnlineList.innerHTML = '<div class="p-8 text-center text-gray-500">Memuat data pesanan masuk...</div>';
            
            // Kita query pesanan dengan status 'pending'
            const q = query(collection(db, "onlineOrders"), where("status", "==", "pending"), orderBy("timestamp", "desc"));
            
            onSnapshot(q, (snapshot) => {
                if (snapshot.empty) {
                    pesananOnlineList.innerHTML = '<div class="p-8 text-center text-gray-500">Tidak ada pesanan online yang perlu dikonfirmasi.</div>';
                    return;
                }
                
                pesananOnlineList.innerHTML = ''; // Kosongkan daftar
                snapshot.forEach(doc => {
                    const order = { id: doc.id, ...doc.data() };
                    const orderCard = document.createElement('div');
                    orderCard.className = 'bg-white rounded-lg shadow p-4 space-y-3';
                    
                    let itemsHtml = order.items.map(item => `<li>${item.quantity}x ${item.name}</li>`).join('');
                    
                    orderCard.innerHTML = `
                <div class="flex justify-between items-center border-b pb-2">
                    <p class="font-bold text-lg">${order.customerName}</p>
                    <p class="font-bold text-blue-600 text-lg">${formatRupiah(order.total)}</p>
                </div>
                <div class="text-sm">
                    <p class="font-semibold mb-1">Pesanan:</p>
                    <ul class="list-disc list-inside text-gray-700">${itemsHtml}</ul>
                </div>
                <div class="grid grid-cols-2 gap-2 pt-2">
                    <button class="tolak-pesanan-btn w-full py-2 bg-red-100 text-red-700 font-bold rounded-lg hover:bg-red-200" data-id="${order.id}">Tolak</button>
                    <button class="terima-pesanan-btn w-full py-2 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600" data-id="${order.id}">Terima</button>
                </div>
            `;
                    pesananOnlineList.appendChild(orderCard);
                });
            }, (error) => {
                console.error("Gagal mendengarkan pesanan online:", error);
                pesananOnlineList.innerHTML = '<div class="p-8 text-center text-red-500">Gagal memuat data.</div>';
            });
        }
        
        // Event listener untuk tombol Terima dan Tolak
        pesananOnlineList.addEventListener('click', async (e) => {
            const target = e.target;
            const onlineOrderId = target.dataset.id;
            if (!onlineOrderId) return;
            
            if (target.classList.contains('terima-pesanan-btn')) {
                target.textContent = 'Memproses...';
                target.disabled = true;
                try {
                    // 1. Ambil data pesanan online
                    const orderDoc = await getDoc(doc(db, "onlineOrders", onlineOrderId));
                    if (!orderDoc.exists()) {
                        throw new Error("Pesanan tidak ditemukan.");
                    }
                    const onlineOrderData = orderDoc.data();
                    
                    // 2. Buat ID baru untuk nota kasir
                    const { shortId, fullId } = await generateNewNotaId();
                    
                    // 3. Siapkan data untuk dimasukkan ke koleksi 'orders' utama
                    const newOrderForCashier = {
                        ...onlineOrderData, // Salin semua data dari pesanan online
                        shortId: shortId,
                        fullId: fullId,
                        status: 'Aktif', // Statusnya menjadi 'Aktif' di kasir
                        isTakeAway: true, // Asumsi pesanan online adalah Take Away
                        timestamp: serverTimestamp() // Gunakan waktu saat pesanan diterima
                    };
                    
                    // 4. Tambahkan ke koleksi 'orders' utama
                    await addDoc(collection(db, "orders"), newOrderForCashier);
                    
                    // 5. Update status pesanan online menjadi 'accepted'
                    await updateDoc(doc(db, "onlineOrders", onlineOrderId), { status: 'accepted' });
                    
                    alert(`Pesanan dari ${onlineOrderData.customerName} berhasil diterima dan ditambahkan ke Nota Aktif.`);
                } catch (error) {
                    console.error("Gagal menerima pesanan:", error);
                    alert("Terjadi kesalahan saat menerima pesanan.");
                    target.textContent = 'Terima';
                    target.disabled = false;
                }
            }
            
            if (target.classList.contains('tolak-pesanan-btn')) {
                if (confirm('Anda yakin ingin menolak pesanan ini?')) {
                    try {
                        // Cukup update status pesanan online menjadi 'rejected'
                        await updateDoc(doc(db, "onlineOrders", onlineOrderId), { status: 'rejected' });
                        alert('Pesanan berhasil ditolak.');
                    } catch (error) {
                        console.error("Gagal menolak pesanan:", error);
                        alert("Terjadi kesalahan saat menolak pesanan.");
                    }
                }
            }
        });
        
        
        // --- Logika Fitur 2: Atur Stok & Ketersediaan ---
        
        // GANTI FUNGSI LAMA DENGAN YANG INI
        // GANTI FUNGSI renderStokProduk YANG LAMA DI adminmeja.html DENGAN INI
        function renderStokProduk() {
            stokProdukList.innerHTML = '<div class="p-8 text-center text-gray-500">Memuat data menu...</div>';
            
            if (!allMenuItems || allMenuItems.length === 0) {
                stokProdukList.innerHTML = '<div class="p-8 text-center text-gray-500">Tidak ada data menu.</div>';
                return;
            }
            
            const groupedItems = allMenuItems.reduce((acc, item) => {
                const category = item.category || 'Lainnya';
                if (!acc[category]) {
                    acc[category] = [];
                }
                acc[category].push(item);
                return acc;
            }, {});
            
            stokProdukList.innerHTML = '';
            const sortedCategories = Object.keys(groupedItems).sort();
            
            sortedCategories.forEach(category => {
                const categoryWrapper = document.createElement('div');
                categoryWrapper.className = 'mb-2';
                
                const header = document.createElement('div');
                header.className = 'flex justify-between items-center p-3 bg-gray-200 rounded-lg cursor-pointer border hover:bg-gray-300';
                header.innerHTML = `
            <h2 class="font-bold text-gray-800">${category} (${groupedItems[category].length})</h2>
            <i class="fas fa-chevron-down transition-transform duration-300"></i>
        `;
                
                const itemsContainer = document.createElement('div');
                itemsContainer.className = 'pt-2 space-y-2 hidden';
                
                groupedItems[category].forEach(item => {
                    const itemDiv = document.createElement('div');
                    // Tambahkan padding kanan untuk memberi ruang lebih
                    itemDiv.className = 'flex justify-between items-center p-3 pr-4 bg-white rounded-lg shadow-sm border ml-2';
                    const isAvailable = item.isAvailable !== false;
                    
                    // ▼▼▼ BAGIAN INI YANG DIPERBARUI ▼▼▼
                    itemDiv.innerHTML = `
                <div>
                    <p class="font-semibold text-gray-800">${item.name}</p>
                </div>
                <div class="flex items-center gap-4">
                    <div class="flex flex-col items-center">
                        <label class="switch">
                            <input type="checkbox" class="stok-toggle" data-id="${item.id}" data-field="isBestSeller" ${item.isBestSeller ? 'checked' : ''}>
                            <span class="slider"></span>
                        </label>
                        <span class="text-xs mt-1 text-gray-500 font-semibold">Best Seller</span>
                    </div>
                    <div class="flex flex-col items-center">
                         <label class="switch">
                            <input type="checkbox" class="stok-toggle" data-id="${item.id}" data-field="isHotDeal" ${item.isHotDeal ? 'checked' : ''}>
                            <span class="slider"></span>
                        </label>
                        <span class="text-xs mt-1 text-gray-500 font-semibold">Hot Deal</span>
                    </div>
                    <div class="flex flex-col items-center">
                         <label class="switch">
                            <input type="checkbox" class="stok-toggle" data-id="${item.id}" data-field="isAvailable" ${isAvailable ? 'checked' : ''}>
                            <span class="slider"></span>
                        </label>
                        <span class="text-xs mt-1 text-gray-500 font-semibold">Tersedia</span>
                    </div>
                </div>
            `;
                    // ▲▲▲ BATAS AKHIR PERUBAHAN ▲▲▲
                    itemsContainer.appendChild(itemDiv);
                });
                
                header.addEventListener('click', () => {
                    itemsContainer.classList.toggle('hidden');
                    header.querySelector('i').classList.toggle('rotate-180');
                });
                
                categoryWrapper.appendChild(header);
                categoryWrapper.appendChild(itemsContainer);
                stokProdukList.appendChild(categoryWrapper);
            });
        }
        
        // Event listener untuk toggle stok
        // GANTI BLOK EVENT LISTENER YANG LAMA DENGAN INI
        stokProdukList.addEventListener('change', async (e) => {
            // Pastikan yang diklik adalah toggle switch
            if (e.target.classList.contains('stok-toggle')) {
                const checkbox = e.target;
                const menuId = checkbox.dataset.id;
                const fieldToUpdate = checkbox.dataset.field; // <-- Mengambil nama field dari data-field
                const newValue = checkbox.checked; // Nilai baru (true atau false)
                
                // Jika salah satu field tidak ada, hentikan fungsi
                if (!menuId || !fieldToUpdate) {
                    console.error("Atribut data-id atau data-field tidak ditemukan.");
                    return;
                }
                
                checkbox.disabled = true; // Nonaktifkan sementara untuk mencegah double-click
                try {
                    const menuRef = doc(db, "menu", menuId);
                    
                    // Buat objek update secara dinamis
                    // Contoh: { isBestSeller: true } atau { isAvailable: false }
                    const updateData = {
                        [fieldToUpdate]: newValue
                    };
                    
                    await updateDoc(menuRef, updateData);
                    // Tidak perlu alert agar pengalaman lebih mulus
                } catch (error) {
                    console.error(`Gagal update field '${fieldToUpdate}':`, error);
                    alert(`Gagal mengubah status ${fieldToUpdate}.`);
                    // Kembalikan ke state semula jika gagal
                    checkbox.checked = !newValue;
                } finally {
                    checkbox.disabled = false; // Aktifkan kembali
                }
            }
        });
        
        
        // --- Logika Fitur 3: Input Menu Baru ---
        confirmInputMenuBtn.addEventListener('click', async () => {
            const name = document.getElementById('input-menu-name').value.trim();
            const price = parseInt(document.getElementById('input-menu-price').value);
            const category = document.getElementById('input-menu-category').value.trim() || 'Lainnya';
            const image = document.getElementById('input-menu-image').value.trim();
            
            if (!name || isNaN(price) || price <= 0) {
                alert('Nama menu dan harga valid harus diisi.');
                return;
            }
            
            confirmInputMenuBtn.textContent = "Menyimpan...";
            confirmInputMenuBtn.disabled = true;
            
            try {
                const newMenuData = {
                    name: name,
                    price: price,
                    category: category,
                    image: image,
                    isAvailable: true // Menu baru otomatis tersedia
                };
                await addDoc(collection(db, "menu"), newMenuData);
                alert(`Menu "${name}" berhasil ditambahkan!`);
                closeInputMenuModal();
            } catch (error) {
                console.error("Gagal menambahkan menu baru:", error);
                alert("Gagal menambahkan menu baru. Cek console untuk detail.");
            } finally {
                confirmInputMenuBtn.textContent = "Tambahkan";
                confirmInputMenuBtn.disabled = false;
            }
        });

        renderOrder();
        setTanggalKerja();
        
   if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(registration => {
            console.log('Service Worker Admin berhasil didaftarkan:', registration);
        }).catch(error => {
            console.log('Pendaftaran Service Worker Admin gagal:', error);
        });
    });
}