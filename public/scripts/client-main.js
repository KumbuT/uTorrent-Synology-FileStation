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

socket.on('torrentQueue', function (data) {
    data.map((torrent, index) => {
        torrent.ETA = new Date(torrent.ETA * 1000).toISOString().substr(11, 8);
        torrent.UpSpeed = (torrent.UpSpeed / 1000000.0).toFixed(2);
        torrent.DownSpeed = (torrent.DownSpeed / 1000000.0).toFixed(2);
    });
    $('#torrent-table').bootstrapTable('load',data);
    // console.log(data);
    // let curData = $('#torrent-table').bootstrapTable('getData', 'useCurrentPage');
    // if (curData.length == 0 && curData.length !== data.length) {
    //     $('#torrent-table').bootstrapTable('load', data);
    // } else {
    //     console.log(curData);
    //     data.map((val, index) => {
    //         $('#torrent-table').bootstrapTable('updateRow', {
    //             'index': index,
    //             'row': val
    //         });
    //     });
    // };
});

socket.on('mediaFolders', function(data){
    console.log(data);
    $('#media-folder-table').bootstrapTable('load',data);
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

let loadMediaFolderTable =  function(){
    $('#media-folder-table').bootstrapTable({
        cardView: false,
        smartDisplay: true,
        columns: [{
            field: 'folderName',
            title: 'Media Folder'
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
        columns: [{
                field: 'id',
                title: 'ID'
            },
            {
                field: 'QueueOrder',
                title: '#'
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
                title: 'Download speed (Mbps)'
            },
            {
                field: 'UpSpeed',
                title: 'Upload speed (Mbps)'
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
                        title: 'Priority'
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

var compareJSON = function (obj1, obj2) {
    let ret = {};
    for (var i in obj2) {
        if (!obj1.hasOwnProperty(i) || obj2[i] !== obj1[i]) {
            ret[i] = obj2[i];
        }
    }
    return ret;
};