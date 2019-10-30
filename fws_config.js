module.exports = {
    "author": "FWS",
    "mail": "china1099@qq.com",
    "projectName": "astar",
    "template": "default",
    "createTime": 1572333709499,
    "distReplace": {
        "*": [
            {
                "find": "feutil.localstatic.com",
                "replace": "pic.my4399.com/re/cms/feUtil"
            },
            {
                "find": "$$localhost/staticfile",
                "replace": "pic.my4399.com/re/cms/feUtil"
            }
        ]
    },
    "srcSync": {
        "targetPath": "",
        "fileType": "*"
    },
    "devSync": {
        "targetPath": "",
        "fileType": "*"
    },
    "distSync": {
        "targetPath": "",
        "fileType": "*"
    }
};