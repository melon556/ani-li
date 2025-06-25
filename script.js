document.addEventListener('DOMContentLoaded', () => {
    const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQQ5KM3koRtNRJHAAJo3GUa5YOWCTBwySRiOaJsAgIKBTxtuoMffHlly0SEskGqlel-mta6NVjo4HKO/pub?gid=0&single=true&output=csv';

    const animeListContainer = document.getElementById('anime-list-container');
    const searchInput = document.getElementById('search-input');
    let allAnimeData = [];

    function parseCsvLine(line) {
        const finalColumns = [];
        let re = /(?:^|,)(?:"([^"]*(?:""[^"]*)*)"|([^,]*))/g;
        let p;
        while (p = re.exec(line)) {
            finalColumns.push(p[1] ? p[1].replace(/""/g, '"') : p[2]);
        }
        return finalColumns.map(col => (col || '').trim());
    }

    function createAnimeElement(animeName, genre, originalLink, driveLabel, typeLabel) {
        let fileId = '';
        let thumbnailUrl = 'https://placehold.co/200x280/cccccc/333333?text=Gambar+Tidak+Tersedia';

        if (originalLink) {
            const driveIdMatch = originalLink.match(/(?:id=|d\/)([a-zA-Z0-9_-]+)(?:[\/\?&]|$)/);
            if (driveIdMatch && driveIdMatch[1]) {
                fileId = driveIdMatch[1];
                thumbnailUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w280`;
            }
        }

        const animeItem = document.createElement('div');
        animeItem.classList.add('anime-item');

        const thumbnailImg = document.createElement('img');
        thumbnailImg.classList.add('anime-thumbnail');
        thumbnailImg.src = thumbnailUrl;
        thumbnailImg.alt = animeName;
        thumbnailImg.onerror = function () {
            this.onerror = null;
            this.src = 'https://placehold.co/200x280/cccccc/333333?text=Gambar+Tidak+Tersedia';
        };

        const titleDiv = document.createElement('div');
        titleDiv.classList.add('anime-title');
        titleDiv.textContent = animeName;

        const genreDiv = document.createElement('div');
        genreDiv.classList.add('anime-genre');
        genreDiv.textContent = genre;

        const typeDiv = document.createElement('div');
        typeDiv.classList.add('anime-type');
        typeDiv.textContent = typeLabel || '';

        const driveDiv = document.createElement('div');
        driveDiv.classList.add('anime-drive');
        driveDiv.textContent = driveLabel || '';

        animeItem.appendChild(thumbnailImg);
        animeItem.appendChild(titleDiv);
        animeItem.appendChild(genreDiv);
        animeItem.appendChild(typeDiv);
        animeItem.appendChild(driveDiv);

        return animeItem;
    }

    function renderAnimeList(filteredList) {
        animeListContainer.innerHTML = '';
        filteredList.forEach(({ animeName, genre, originalLink, driveLabel, typeLabel }) => {
            const animeEl = createAnimeElement(animeName, genre, originalLink, driveLabel, typeLabel);
            animeListContainer.appendChild(animeEl);
        });
    }

    function handleSearchInput() {
        const query = searchInput.value.trim().toLowerCase();
        if (!query) {
            renderAnimeList(allAnimeData);
            return;
        }

        const filtered = allAnimeData.filter(({ animeName, genre, typeLabel }) =>
            animeName.toLowerCase().includes(query) ||
            genre.toLowerCase().includes(query) ||
            typeLabel.toLowerCase().includes(query)
        );
        renderAnimeList(filtered);
    }

    let typingTimer;
    searchInput.addEventListener('input', () => {
        clearTimeout(typingTimer);
        typingTimer = setTimeout(handleSearchInput, 400);
    });

    fetch(csvUrl)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.text();
        })
        .then(csvText => {
            const rows = csvText.trim().split('\n').slice(1);
            const parsedData = [];

            rows.forEach(row => {
                const columns = parseCsvLine(row);
                if (columns.length >= 6) {
                    const animeName = columns[1];
                    const genre = columns[2];
                    const originalLink = columns[3];
                    const driveLabel = columns[4];
                    const typeLabel = columns[5];
                    if (animeName && genre) {
                        parsedData.push({ animeName, genre, originalLink, driveLabel, typeLabel });
                    }
                }
            });

            allAnimeData = parsedData;
            renderAnimeList(allAnimeData);
        })
        .catch(error => {
            console.error('Gagal memuat CSV:', error);
            animeListContainer.textContent = 'Gagal memuat daftar anime.';
        });
});
