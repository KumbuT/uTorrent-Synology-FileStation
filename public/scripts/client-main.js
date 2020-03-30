let socket = io();

$().ready(function () {
    loadQueueTable();
    loadFileTable();
    loadEventTable();
    loadMediaFolderTable();
    loadUtStats();
});

/**
 * All socket opertions
 */

socket.on('connect_error', function (error) {
    console.log(error);
    socket.close();
    socket.open();
});

socket.on('torrentQueue', function (data) {
    data.map((torrent, index) => {
        torrent.ETA = new Date(torrent.ETA * 1000).toISOString().substr(11, 8);
        torrent.UpSpeed = (torrent.UpSpeed / 1000000.0).toFixed(2);
        torrent.DownSpeed = (torrent.DownSpeed / 1000000.0).toFixed(2);
        torrent.nested.map((file) => {
            switch (file.Priority) {
                case 0:
                    file.Priority = 'No';
                    break;
                case 2:
                    file.Priority = 'Yes';
                    break;
                default:
                    file.Priority = 'N/A'
            };

            file.Downloaded = file.Downloaded + "(" + ((file.Downloaded / file.FileSize) * 100).toFixed(2) + '%)';
        });
        //add new torrents
        data.filter(torrent => !$('#torrent-table').bootstrapTable('getData').map(row => {
            return row.Hash;
        }).includes(torrent.Hash)).map(torrent => $('#torrent-table').bootstrapTable('append', torrent))

        //remove deleted or completed torrents
        $('#torrent-table').bootstrapTable('getData').filter(torrent => !data.map(row => {
            return row.Hash;
        }).includes(torrent.Hash)).map(torrent => {
            $('#torrent-table').bootstrapTable('removeByUniqueId', torrent.id)
        });

        //update existing torrents
        $('#torrent-table').bootstrapTable('updateByUniqueId', {
            id: torrent.id,
            row: torrent
        });
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

// function responseHandler(res) {
//     $.each(res.rows, function (i, row) {
//         row.state = $.inArray(row.id, selections) !== -1
//     })
//     return res
// }

function operateFormatter(value, row, index) {
    return [
        '<a class="remove" href="javascript:void(0)" title="Remove">',
        '<i class="fa fa-trash"></i>',
        '</a>'
    ].join('')
}

window.operateEvents = {
    'click .remove': function (e, value, row, index) {
        let deleteConsent = confirm(`Are you sure you want to delete ${$('#media-folder-table').bootstrapTable('getRowByUniqueId', index+1).folderName}`);
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
})


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
            title: 'Online',
        }]
    });
};
let loadQueueTable = function () {
    $('#torrent-table').bootstrapTable({
        cardView: false,
        showToggle: false,
        search: true,
        smartDisplay: true,
        uniqueId: 'id',
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
        // data: [{
        //     QueueOrder: '1',
        //     Name: 'Some Torrent',
        //     Status: 'In Progress',
        //     Hash: '#######################',
        //     ETA: 1234,
        //     DownSpeed: 1234567,
        //     UpSpeed: 1234567,
        //     'nested': [{
        //         FileName: 'test',
        //         Download: 'No'
        //     }]
        // }]
    });
    console.log($('#torrent-table').bootstrapTable('getOptions'));
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