// Variables globales pour les graphiques
let statsPanel = null;
let resultsChart = null;

// Initialisation des graphiques quand le DOM est prêt
document.addEventListener('DOMContentLoaded', function() {
    try {
        statsPanel = document.getElementById('stats-panel');
        initCharts();
        
        // Rendre la fonction updateStats disponible globalement
        window.updateStats = updateStats;
    } catch (error) {
        console.error("Erreur lors de l'initialisation des statistiques:", error);
    }
});

// Fonction pour initialiser les graphiques
function initCharts() {
    // Configuration des graphiques avec Chart.js
    Chart.defaults.font.family = 'Arial, sans-serif';
    Chart.defaults.color = '#333';
    
    // Graphique des résultats
    const resultsCtx = document.getElementById('results-chart').getContext('2d', { willReadFrequently: true });
    resultsChart = new Chart(resultsCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: []
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                title: {
                    display: true,
                    text: 'Résultats par candidat',
                    color: '#003399',
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    grid: {
                        color: '#e0e0e0'
                    },
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString() + ' votes';
                        }
                    }
                },
                y: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// Fonction principale pour mettre à jour les statistiques
function updateStats(properties) {
    try {
        // Afficher le panneau
        statsPanel.classList.remove('hidden');

        // Traiter les données
        const data = processGeoJSONData(properties);

        // Mise à jour du titre
        document.getElementById('circo-name').textContent = 'Circonscription : ' + (properties.NM_CEP || 'Non définie');

        // Mise à jour du graphique des votes par parti
        updateResultsChart(data.resultats);
        
        // Mise à jour du candidat gagnant
        updateWinner(data.resultats);

    } catch (error) {
        console.error('Erreur lors de la mise à jour des statistiques:', error);
    }
}

// Fonction pour traiter les données des votes par parti
function processGeoJSONData(properties) {
    // Extraire les données des partis à partir des propriétés
    const resultats = [];
    
    // Obtenir les votes de chaque parti
    const vote_caq = parseInt(properties.vote_caq || 0);
    const vote_plq = parseInt(properties.vote_plq || 0);
    const vote_qs = parseInt(properties.vote_qs || 0);
    const vote_pq = parseInt(properties.vote_pq || 0);
    const vote_pcq = parseInt(properties.vote_pcq || 0);
    
    // Créer les résultats pour chaque parti ayant des votes
    if (vote_caq > 0) {
        resultats.push({
            prenom: 'Candidat',
            nom: 'CAQ',
            parti: 'C.A.Q.-É.F.L.',
            nb_votes: vote_caq,
            couleur: '#00B4E5'
        });
    }
    
    if (vote_plq > 0) {
        resultats.push({
            prenom: 'Candidat',
            nom: 'PLQ',
            parti: 'P.L.Q./Q.L.P.',
            nb_votes: vote_plq,
            couleur: '#FF0000'
        });
    }
    
    if (vote_pq > 0) {
        resultats.push({
            prenom: 'Candidat',
            nom: 'PQ',
            parti: 'P.Q.',
            nb_votes: vote_pq,
            couleur: '#004C9E'
        });
    }
    
    if (vote_qs > 0) {
        resultats.push({
            prenom: 'Candidat',
            nom: 'QS',
            parti: 'Q.S.',
            nb_votes: vote_qs,
            couleur: '#FF5605'
        });
    }
    
    if (vote_pcq > 0) {
        resultats.push({
            prenom: 'Candidat',
            nom: 'PCQ',
            parti: 'P.C.Q.',
            nb_votes: vote_pcq,
            couleur: '#8A2BE2'
        });
    }
    
    // Si des noms spécifiques de candidats sont disponibles, les utiliser
    if (properties.nom && properties.prenom && properties.abrev_parti) {
        // Déterminer le parti du candidat actuel
        const partiAbrev = properties.abrev_parti;
        let partiCible = '';
        
        if (partiAbrev === 'C.A.Q.-É.F.L.') {
            partiCible = 'C.A.Q.-É.F.L.';
        } else if (partiAbrev === 'P.L.Q./Q.L.P.') {
            partiCible = 'P.L.Q./Q.L.P.';
        } else if (partiAbrev === 'P.Q.') {
            partiCible = 'P.Q.';
        } else if (partiAbrev === 'Q.S.') {
            partiCible = 'Q.S.';
        } else if (partiAbrev === 'P.C.Q.') {
            partiCible = 'P.C.Q.';
        }
        
        // Mettre à jour le nom du candidat pour son parti
        const partiIndex = resultats.findIndex(function(r) {
            return r.parti === partiCible;
        });
        
        if (partiIndex >= 0) {
            resultats[partiIndex].prenom = properties.prenom;
            resultats[partiIndex].nom = properties.nom;
        }
    }
    
    // Tri par nombre de votes décroissant
    resultats.sort(function(a, b) {
        return b.nb_votes - a.nb_votes;
    });
    
    return {
        resultats: resultats
    };
}

// Fonction pour mettre à jour le graphique des résultats
function updateResultsChart(resultats) {
    // S'assurer qu'il y a des résultats à afficher
    if (resultats.length === 0) {
        // Ajouter un résultat fictif pour éviter les graphiques vides
        resultats.push({
            prenom: '',
            nom: 'Aucun résultat',
            parti: '',
            nb_votes: 0,
            couleur: '#cccccc'
        });
    }
    
    resultsChart.data.labels = resultats.map(function(r) {
        return r.prenom + ' ' + r.nom + ' (' + r.parti + ')';
    });
    
    resultsChart.data.datasets[0].data = resultats.map(function(r) {
        return r.nb_votes;
    });
    
    resultsChart.data.datasets[0].backgroundColor = resultats.map(function(r) {
        return r.couleur || getPartyColor(r.parti);
    });
    
    resultsChart.update();
}

// Fonction pour mettre à jour le bloc du gagnant
function updateWinner(resultats) {
    const winnerContainer = document.querySelector('.winner-card');
    
    if (!winnerContainer) return;
    
    if (resultats.length === 0 || resultats[0].nb_votes === 0) {
        winnerContainer.innerHTML = `
            <h3>Gagnant</h3>
            <div class="winner-info">Aucun candidat</div>
        `;
        return;
    }
    
    const winner = resultats[0];
    const partyColor = winner.couleur || getPartyColor(winner.parti);
    
    winnerContainer.innerHTML = `
        <h3>Gagnant</h3>
        <div class="winner-info">
            <div class="winner-name">${winner.prenom} ${winner.nom}</div>
            <div class="winner-party" style="color: ${partyColor};">${winner.parti}</div>
            <div class="winner-votes">${winner.nb_votes.toLocaleString()} votes</div>
        </div>
    `;
}

// Fonction pour obtenir la couleur d'un parti
function getPartyColor(parti) {
    const colors = {
        'C.A.Q.-É.F.L.': '#00B4E5',
        'P.L.Q./Q.L.P.': '#FF0000',
        'P.Q.': '#004C9E',
        'Q.S.': '#FF5605',
        'P.V.Q./G.P.Q.': '#00FF00',
        'P.C.Q.': '#8A2BE2'
    };
    return colors[parti] || '#CCCCCC';
}