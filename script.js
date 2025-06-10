document.addEventListener('DOMContentLoaded', () => {
    const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQQ5KM3koRtNRJHAAJo3GUa5YOWCTBwySRiOaJsAgIKBTxtuoMffHlly0SEskGqlel-mta6NVjo4HKO/pub?gid=0&single=true&output=csv';

    const animeListContainer = document.getElementById('anime-list-container');

    // Fungsi yang diperbarui untuk mem-parse satu baris CSV
    // Fungsi ini lebih baik dalam menangani koma di dalam kutipan ganda dan kolom kosong (termasuk trailing comma)
    function parseCsvLine(line) {
        const columns = [];
        // Regex ini akan mencocokkan setiap 'bagian' dari baris CSV:
        // 1. String yang diapit kutipan ganda (dan kutipan ganda yang di-escape "")
        // ATAU
        // 2. String yang tidak mengandung koma atau kutipan ganda
        // Modifikasi penting: tambahkan |$ di akhir untuk menangani kolom kosong di akhir baris
        const regex = /(?:^|,)(?:"([^"]*(?:""[^"]*)*)"|([^,]*))/g;
        let match;

        while ((match = regex.exec(line)) !== null) {
            // Jika ada grup yang diapit kutipan ganda (match[1]), gunakan itu
            // Jika tidak, gunakan grup non-kutipan ganda (match[2])
            let value = match[1] !== undefined ? match[1].replace(/""/g, '"') : match[2];

            // Tambahkan nilai ke array kolom setelah membersihkan spasi
            columns.push(value.trim());
        }

        // CSV parser ini akan menghasilkan kolom tambahan kosong di awal jika baris dimulai dengan koma,
        // dan mungkin perlu penyesuaian untuk kasus sangat spesifik.
        // Untuk Google Sheets, yang penting adalah menangani kolom kosong di akhir.
        // Regex di atas (terutama (?:^|,)) sudah cukup baik.

        // Jika baris berakhir dengan koma (misal: "a,b,"), regex mungkin tidak otomatis menangkap kolom kosong terakhir.
        // Pastikan jumlah kolom sesuai harapan, jika tidak, bisa tambahkan penanganan eksplisit untuk kolom kosong di akhir.
        // Untuk kasus Anda "...,", hasil regex seharusnya tetap 4 kolom jika diimplementasikan dengan hati-hati.
        // Mari kita coba regex yang lebih sederhana untuk memisahkan, dan kemudian membersihkan.
        
        // Coba regex yang lebih umum untuk memisahkan berdasarkan koma yang tidak ada di dalam kutipan
        const parts = line.match(/(".*?"|[^",]+|,)/g); // Ambil semua bagian: string di kutip, string tanpa kutip, atau koma

        if (!parts) return []; // Baris kosong

        let currentColumn = "";
        let inQuote = false;
        for (let i = 0; i < parts.length; i++) {
            let part = parts[i];
            
            // Handle quotes
            if (part.startsWith('"') && part.endsWith('"') && part.length > 1) {
                // Fully quoted string
                columns.push(part.substring(1, part.length - 1).replace(/""/g, '"').trim());
                currentColumn = ""; // Reset for next column
            } else if (part === ',') {
                if (!inQuote) {
                    columns.push(currentColumn.trim());
                    currentColumn = "";
                } else {
                    currentColumn += part; // Comma inside quote
                }
            } else {
                currentColumn += part;
            }
        }
        // Push the last accumulated column if it exists
        if (currentColumn !== "" || (parts.length > 0 && parts[parts.length - 1] === ',')) {
             columns.push(currentColumn.trim());
        }

        // Revisi terakhir: ini adalah salah satu regex parsing CSV paling stabil untuk JS,
        // yang memperhitungkan kutipan ganda dan koma.
        const finalColumns = [];
        let re = /(?:^|,)(?:"([^"]*(?:""[^"]*)*)"|([^,]*))/g;
        let p;
        while (p = re.exec(line)) {
            finalColumns.push(p[1] ? p[1].replace(/""/g, '"') : p[2]);
        }
        
        return finalColumns.map(col => (col || '').trim()); // Pastikan tidak ada undefined dan trim
    }


    fetch(csvUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text();
        })
        .then(csvText => {
            const rows = csvText.trim().split('\n');
            const dataRows = rows.slice(1);

            dataRows.forEach(row => {
                // Abaikan baris kosong di tengah atau akhir spreadsheet
                if (row.trim() === '') {
                    return;
                }

                const columns = parseCsvLine(row);

                // Baris error Anda: "211,Zombieland Saga Revenge,"Award Winning, Comedy, Supernatural","
                // ini punya 4 kolom jika di-parse dengan benar, kolom terakhir kosong.
                // Jika columns.length < 4, berarti ada masalah parsing.
                if (columns.length >= 4) {
                    const animeName = columns[1];
                    const genre = columns[2];
                    const originalLink = columns[3];

                    if (!animeName || !genre) { // Link thumbnail bisa saja kosong, tapi nama dan genre harus ada
                        console.warn('Melewati baris yang tidak lengkap (nama/genre kosong):', row);
                        return;
                    }

                    let fileId = '';
                    let thumbnailUrl = 'https://placehold.co/200x280/cccccc/333333?text=Gambar+Tidak+Tersedia'; // Default placeholder

                    // Hanya coba mengekstrak ID jika ada link asli
                    if (originalLink) {
                        const driveIdMatch = originalLink.match(/(?:id=|d\/)([a-zA-Z0-9_-]+)(?:[\/\?&]|$)/);
                        if (driveIdMatch && driveIdMatch[1]) {
                            fileId = driveIdMatch[1];
                            // Gunakan ID ini untuk membuat URL thumbnail
                            thumbnailUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w280`;
                        } else {
                            console.warn(`Tidak dapat mengekstrak ID file dari link: ${originalLink} (baris: ${animeName})`);
                        }
                    } else {
                        console.warn(`Link thumbnail kosong untuk: ${animeName}`);
                    }


                    const animeItem = document.createElement('div');
                    animeItem.classList.add('anime-item');

                    const thumbnailImg = document.createElement('img');
                    thumbnailImg.classList.add('anime-thumbnail');
                    thumbnailImg.src = thumbnailUrl;
                    thumbnailImg.alt = animeName;

                    thumbnailImg.onerror = function() {
                        this.onerror = null;
                        this.src = 'https://placehold.co/200x280/cccccc/333333?text=Gambar+Tidak+Tersedia';
                        console.error(`Gagal memuat gambar untuk "${animeName}": ${thumbnailUrl}`);
                    };

                    const titleDiv = document.createElement('div');
                    titleDiv.classList.add('anime-title');
                    titleDiv.textContent = animeName;

                    const genreDiv = document.createElement('div');
                    genreDiv.classList.add('anime-genre');
                    genreDiv.textContent = genre;

                    animeItem.appendChild(thumbnailImg);
                    animeItem.appendChild(titleDiv);
                    animeItem.appendChild(genreDiv);

                    animeListContainer.appendChild(animeItem);
                } else {
                    console.warn('Baris memiliki kolom terlalu sedikit atau tidak terparse dengan benar:', row, 'Hasil parse:', columns);
                }
            });
        })
        .catch(error => {
            console.error('Terjadi kesalahan saat mengambil atau mem-parse CSV:', error);
            animeListContainer.textContent = 'Gagal memuat daftar anime. Pastikan URL CSV benar dan dapat diakses.';
        });
});