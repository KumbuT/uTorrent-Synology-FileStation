/** All Globals */

let socket = io();
let torrentTable = {
    expandedRowId: []
};


let onLoadCallback = function () {

    loadQueueTable();
    loadFileTable();
    loadEventTable();
    loadMediaFolderTable();
    loadUtStats();
    loadDSStats();
    loadMoviesTable();

    /**Force a movie table refresh on change in ratings or genre */
    let moviesTableRefresh = function () {

        let minRating = $('#movieRating').val();
        let genre = $('#movieGenre').val();
        // $('#movies-table').bootstrapTable('destroy');
        $('#movies-table').bootstrapTable('refresh', {
            url: '/movies',
            query: {
                'rating': minRating,
                'genre': genre
            }
        });
    };
    $("#movieGenre").on('change', function () {
        moviesTableRefresh();
    });

    $("#movieRating").on('change', function () {
        moviesTableRefresh();

    });
};


if (
    document.readyState === "complete" ||
    (document.readyState !== "loading" && !document.documentElement.doScroll)
) {
    onLoadCallback();
} else {
    document.addEventListener("DOMContentLoaded", onLoadCallback);
}

/**
 * All socket opertions
 */

socket.on('connect_error', function (error) {
    console.log(error);
    socket.close();
    socket.open();
});

socket.on('torrentQueue', function (data) {
    if (data == undefined || data.length == 0) {
        data = [];
    }

    data.map((torrent, index) => {

        //add new torrents
        data.filter(torrent => !$('#torrent-table').bootstrapTable('getData').map(row => {
            return row.Hash;
        }).includes(torrent.Hash)).map(torrent => $('#torrent-table').bootstrapTable('append', torrent));

        //remove deleted or completed torrents
        $('#torrent-table').bootstrapTable('getData').filter(torrent => !data.map(row => {
            return row.Hash;
        }).includes(torrent.Hash)).map(torrent => {
            $('#torrent-table').bootstrapTable('removeByUniqueId', torrent.id);
            //$('#torrent-table').bootstrapTable('resetView');
        });


        let curRow = $('#torrent-table').bootstrapTable('getRowByUniqueId', torrent.id);

        if (curRow) {
            if (torrent.Name != curRow.Name) $('#torrent-table').bootstrapTable('updateCellByUniqueId', {
                id: torrent.id,
                field: 'Name',
                value: torrent.Name
            });

            if (torrent.Status != curRow.Status) $('#torrent-table').bootstrapTable('updateCellByUniqueId', {
                id: torrent.id,
                field: 'Status',
                value: torrent.Status
            });

            if (torrent.ETA != curRow.ETA) $('#torrent-table').bootstrapTable('updateCellByUniqueId', {
                id: torrent.id,
                field: 'ETA',
                value: new Date(torrent.ETA * 1000).toISOString().substr(11, 8)
            });

            if (torrent.UpSpeed != curRow.UpSpeed) $('#torrent-table').bootstrapTable('updateCellByUniqueId', {
                id: torrent.id,
                field: 'UpSpeed',
                value: (torrent.UpSpeed / 1000000.0).toFixed(2)
            });

            if (torrent.DownSpeed != curRow.DownSpeed) $('#torrent-table').bootstrapTable('updateCellByUniqueId', {
                id: torrent.id,
                field: 'DownSpeed',
                value: (torrent.DownSpeed / 1000000.0).toFixed(2)
            });

            torrent.nested.map((file, index) => {
                switch (file.Priority) {
                    case 0:
                        file.Priority = 'No';
                        break;
                    case 2:
                        file.Priority = 'Yes';
                        break;
                    default:
                        file.Priority = 'N/A';
                }

                if (file.Priority != curRow.nested[index].Priority) $('torrent-table').bootstrapTable('updateCellByUniqueId', {
                    id: torrent.nested.id,
                    field: 'Priority',
                    value: file.Priority
                });

                if (file.Downloaded != curRow.nested[index].Downloaded) $('#torrent-table').bootstrapTable('updateCellByUniqueId', {
                    id: torrent.nested.id,
                    field: 'Downloaded',
                    value: file.Downloaded + "(" + ((file.Downloaded / file.FileSize) * 100).toFixed(2) + '%)'
                });
            });
        } else {
            console.error(`Cannot find the row to update.  Ref. $("#torrent-table").bootstrapTable("getRowByUniqueId", ${index}) and torrent: ${torrent}`);
        }
    });
});

socket.on('mediaFolders', function (data) {
    console.log(data);
    $('#media-folder-table').bootstrapTable('load', data);
});

socket.on('fileQueue', function (data) {
    $('#file-table').bootstrapTable('load', data);
});

socket.on('hearYe', function (data) {
    $('#event-table').bootstrapTable('append', data);
});

socket.on('uTorrentHealth', function (data) {
    $('#uTStats').bootstrapTable('load', data);
});

socket.on('synostatus', function (data) {
    $('#dsStats').bootstrapTable('load', data);
});

function operateFormatter(value, row, index) {
    return [
        '<a class="remove" href="javascript:void(0)" title="Remove">',
        '<i class="fa fa-trash"></i>',
        '</a>'
    ].join('');
}

window.operateEvents = {
    'click .remove': function (e, value, row, index) {
        let deleteConsent = confirm(`Are you sure you want to delete ${row.folderName}`);
        if (deleteConsent) {
            emitDeleteFolderEvent(row);
        }
    }
};
let emitDeleteFolderEvent = function (data) {
    socket.emit('delete-folder', JSON.stringify(data));
};

socket.on('delete-folder', function (data) {
    console.log('received data' + data);
});


socket.on('updateMediaFolderList', (row) => {
    console.log('Response for update media folders list received');
    row = JSON.parse(row);
    $('#media-folder-table').bootstrapTable('remove', {
        field: 'id',
        values: [row.id]
    });
});
let loadMediaFolderTable = function () {
    $('#media-folder-table').bootstrapTable({
        cardView: false,
        smartDisplay: true,
        columns: [{
            field: 'id',
            title: 'ID'
        }, {
            field: 'folderName',
            title: 'Media Folder'
        }, {
            field: 'operate',
            title: 'Delete',
            align: 'center',
            events: window.operateEvents,
            formatter: operateFormatter
        }]
    });
};

let loadUtStats = function () {
    $('#uTStats').bootstrapTable({
        cardView: true,
        smartDisplay: true,
        columns: [{
            field: 'online',
            title: 'Status',
        }, {
            field: 'build',
            title: 'Build'
        }]
    });
};

let loadDSStats = function () {
    $('#dsStats').bootstrapTable({
        cardView: true,
        smartDisplay: true,
        columns: [{
            field: 'status',
            title: 'Status',
        }, {
            field: 'hostname',
            title: 'Host Name'
        }]
    });
};


let loadMoviesTable = function () {
    var table = $('#movies-table').DataTable({
        responsive: true,
        cardView: false,
        showFullscreen: true,
        search: true,
        showRefresh: true,
        autoRefresh: false,
        //reInit: false,
        detailView: true,
        paging: true,
        processing: true,
        serverSide: true,
        searchDelay: 1000,
        order: [
            [4, 'desc']
        ],
        ajax: {
            url: '/movies',
            dataSrc: 'data'
        },
        columns: [{
                className: 'details-control',
                orderable: false,
                data: null,
                defaultContent: ''
            }, {
                title: "<img height='16px' width='16px'src='./img/652992_magnet_512x512.png'/>",
                data: 'torrents',
                sortable: false,
                searchable: false,
                className: 'dt-center',
                render: function (data, type, row, meta) {
                    let murl = "";
                    let qualityButton = "";
                    data.map((val, index) => {
                        qualityButton += "<a class='btn btn-info btn-xs' href='magnet:?xt=urn:btih:" + data[index].hash + "&dn=" + data[index].url + "&tr=udp://open.demonii.com:1337/announce&tr=udp://tracker.openbittorrent.com:80&tr=udp://tracker.coppersurfer.tk:6969&tr=udp://glotorrents.pw:6969/announce&tr=udp://tracker.opentrackr.org:1337/announce&tr=udp://torrent.gresille.org:80/announce&tr=udp://p4p.arenabg.com:1337&tr=udp://tracker.leechers-paradise.org:6969'>" + val.type + " " + val.quality + "</a><br/>";
                    });
                    return qualityButton.toString();
                }
            },
            {
                title: "Title",
                data: 'title_english',
                searchable: true,
                render: function (data, type, row, meta) {
                    return "<img src='" + row.small_cover_image + "'/><br/><span class='text-primary'>" + data + "</span><br/>";
                }
            },
            {
                title: "Year",
                data: 'year',
                searchable: false
            }, {
                title: "Uploaded",
                data: 'date_uploaded',
                searchable: true
            },
            {
                title: "Runtime",
                data: 'runtime',
                sortable: false,
                searchable: false,
                render: function (data, type, row, meta) {
                    if (data < 60 && data != 0) {
                        return data + " mins";
                    } else if (data == 0) {
                        return "-";
                    } else {
                        let hr = Math.trunc(data / 60);
                        let min = data % 60;
                        return hr + ' Hr ' + min + ' mins ';
                    }
                }
            },
            {
                title: "Summary",
                data: 'summary',
                sortable: false,
                searchable: false,
                render: function (data, type, row, meta) {
                    return "<span class='label label-default'>" + row.language + "</span>&nbsp;" + data;
                }
            },
            {
                title: "Rating",
                data: 'rating',
                searchable: false
            },
            {
                title: "Genre",
                data: 'genres',
                sortable: false,
                render: function (data, type, row, meta) {
                    let genres = data ? data.toString().split(',') : [];
                    let genresLabels = "";
                    genres.map((value, index) => {
                        genresLabels += "<span class='label label-success'>" + value + "</span><br/>";
                    });
                    return genresLabels;

                }
            }
        ]
    });

    /* Formatting function for row details - modify as you need */
    let format = (d) => {
        return '<table class="table" id=' + d.id + '></table>';
    };
    // Add event listener for opening and closing details
    $('#movies-table').on('click', 'td.details-control', function () {
        var tr = $(this).closest('tr');
        var row = table.row(tr);
        if (row.child.isShown()) {
            // This row is already open - close it
            row.child.hide();
            tr.removeClass('shown');
        } else {
            // Open this row (the format() function would return the data to be shown)
            if (row.child() && row.child().length) {
                row.child.show();
            } else {
                row.child(format(row.data(), tr)).show();
                $(`#${row.data().id}`).DataTable({
                    paging: false,
                    bFilter: false,
                    blengthChange: false,
                    bInfo: false,
                    ajax: {
                        url: `/movieinfo/${row.data().id}`,
                        dataSrc: 'data'
                    },
                    columns: [{
                        data: 'cast',
                        sortable: false,
                        searchable: false,
                        render: function (data, type, row, meta) {
                            let movieDetails = `<div class="jumbotron1" style="background-image: url(${row.background_image}); background-repeat: no-repeat; background-size: cover">`;
                            movieDetails += `<h2>Description <span class="badge">${row.mpa_rating}</span></h2>` +
                                `<p>${row.description_full}</p>`;
                            if (data) {
                                movieDetails += '<h2>Cast</h2>';

                                data.map((value, index) => {
                                    movieDetails += `<div class="image-item">` +
                                        `<img src="${(value.hasOwnProperty('url_small_image')? value.url_small_image : '../img/placeholder-image.png')}" class="img-fluid rounded cast" alt="">` +
                                        `<span class="caption"><a href="https://www.imdb.com/name/nm${value.imdb_code}" target="_blank">${value.name}</a> as ${value.character_name}</span>` +
                                        `</div>`;
                                });
                            }
                            movieDetails += '<h2>Screens</h2>';
                            movieDetails += '<div class="image-item">' +
                                `<img class="img-fluid flat-left" src="${row.medium_screenshot_image1}" alt="First slide">` +
                                '</div>' +
                                '<div  class="image-item">' +
                                `<img class="img-fluid" src="${row.medium_screenshot_image2}" alt="Second slide">` +
                                '</div>' +
                                '<div class="image-item">' +
                                `<img class="img-fluid float-rigth" src="${row.medium_screenshot_image3}" alt="Third slide">` +
                                '<div>';
                            movieDetails += '</div>'; //closes the jumbotron
                            return movieDetails;
                        }
                    }]
                });
            }
            tr.addClass('shown');
            $('.thead').css("border", 'none');

        }
    });
};

let loadQueueTable = function () {
    $('#torrent-table').bootstrapTable({
        cardView: false,
        showFullscreen: true,
        search: true,
        smartDisplay: true,
        uniqueId: 'id',
        autoRefresh: false,
        //reInit: false,
        columns: [{
                field: 'id',
                title: 'ID'
            },
            {
                field: 'QueueOrder',
                title: 'Queue Order'
            },
            {
                field: 'Name',
                title: 'Name'
            },
            {
                field: 'Status',
                title: 'Status'
            },
            {
                field: 'Hash',
                title: 'Torrent Hash'
            },
            {
                field: 'ETA',
                title: 'ETA (HH:MM:SS)'
            },
            {
                field: 'DownSpeed',
                title: 'Download(MB/s)'
            },
            {
                field: 'UpSpeed',
                title: 'Upload(MB/s)'
            }
        ],
        detailView: true,
        onExpandRow: function (index, row, $files) {
            $files.html('<table></table>').find('table').bootstrapTable({
                columns: [{
                        field: 'id',
                        title: 'ID'
                    },
                    {
                        field: 'FileName',
                        title: 'Name'
                    },
                    {
                        field: 'FileSize',
                        title: 'Size'
                    },
                    {
                        field: 'Downloaded',
                        title: 'Downloaded'
                    },
                    {
                        field: 'Priority',
                        title: 'Is Downloading?'
                    }
                ],
                data: row.nested
            });
        },
    });

    // $('#torrent-table').on('collapse-row.bs.table', function (index, row, detailView) {
    //     let indexToRemove = -1;
    //     $('#torrent-table').bootstrapTable('expandRowByUniqueId', detailView.id);
    //     // torrentTable.expandedRowId.map(function (val, index) {
    //     //     if (detailView.id == val) {
    //     //         $('#torrent-table').bootstrapTable('expandRowByUniqueId', detailView.id);
    //     //         indexToRemove = index;
    //     //     }
    //     // });
    //     // torrentTable.expandedRowId.splice(indexToRemove, 1);
    //     // console.log(`Expanded Rows ${torrentTable.expandedRowId}`);
    // });

    $('#torrent-table').on('all.bs.table', function (event, args) {
        if (args == "reset-view.bs.table") {
            let indexToRemove = -1;
            torrentTable.expandedRowId.map(function (val, index) {
                $('#torrent-table').bootstrapTable('expandRowByUniqueId', val);
                indexToRemove = index;
            });
            torrentTable.expandedRowId.splice(indexToRemove, 1);
            //console.log(`Expanded Rows ${torrentTable.expandedRowId}`);
        }
    });
    $('#torrent-table').on('click-cell.bs.table', function (field, value, row, $element) {
        console.log(`Field: ${field.toString()} Value: ${value}`);
    });
    $('#torrent-table').on('expand-row.bs.table', function (index, row, $detail) {
        if (!torrentTable.expandedRowId.includes($detail.id, 0)) torrentTable.expandedRowId.push($detail.id);
        console.log(`Expanded Rows ${torrentTable.expandedRowId}`);
    });
    $('.torrent-toolbar input').change(function () {
        $('#torrent-table').bootstrapTable('destroy').bootstrapTable({
            smartDisplay: $(this).prop('checked')
        });
    });
};

let loadFileTable = function () {
    $('#file-table').bootstrapTable({
        columns: [{
                field: 'fileName',
                title: 'File Name'
            },
            {
                field: 'filePath',
                title: 'Local Path'
            }
        ]
    });
};

let loadEventTable = function () {
    $('#event-table').bootstrapTable({
        pagination: true,
        pageSize: 10,
        cardView: false,
        showToggle: true,
        search: true,
        smartDisplay: true,
        showColumns: true,
        columns: [{
                field: 'dateTime',
                title: 'TS',
                sortable: true,
                order: 'desc'
            },
            {
                field: 'isError',
                title: 'Type',
                searchable: true
            }, {
                field: 'message',
                title: 'Message'
            }
        ],
        sortName: 'dateTime',
        sortOrder: 'desc'
    });
};