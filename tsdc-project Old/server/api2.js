var express = require('express');
var sql = require('mssql');
var fs = require('fs');
var app = express.Router();
var bodyParser = require('body-parser');
require('./config/connect.js');
app.use(bodyParser.json());
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

//////////////// DATE TIME NOW ///////////////////
function DateNow(nDateTime) {
    function addZero(i) {
        if (i < 10) {
            i = "0" + i;
        }
        return i;
    }
    var nDate = (new Date()).toISOString().slice(0, 10);
    var d = new Date();
    var h = addZero(d.getHours());
    var m = addZero(d.getMinutes());
    var s = addZero(d.getSeconds());
    return nDateTime = nDate + " " + h + ":" + m + ":" + s;
}


app.get('/download/:filename', function (req, res) {
    var filename = req.params.filename;
    var file = __dirname + '/files/' + filename;
    res.download(file);
});





app.post('/login', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    var query;
    console.log("USER LOGIN :" + fromdata.user_id);
    console.log("password LOGIN :" + fromdata.password);
    new sql.ConnectionPool(db).connect().then(pool => {
        query = `
        SELECT 
            INTERNAL_ID,USER_ID,CATEGORY,SUB_CATEGORY,FIRSTNAME,LASTNAME,WORKER_ID
            FROM 
                [10.26.1.11].[TSDC_CONVEYOR].[DBO].TSDC_EMPLOYEE 
        WHERE 
            USER_ID = '${fromdata.user_id}' 
            AND STATUS = '1'
            AND PASSWORD ='${fromdata.password}';

       
                `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset[0];
                if (recordset.recordset.length == 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        member: data
                    };
                    res.json(dataout);
                }
            }
            sql.close();
        });
    });
});

app.post('/LOAD_USERTABLECHECK', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    console.log("LOAD_USERTABLECHECK :");
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `        
               
     select TABLE_CHECK,PIN_CODE,USER_NAME,WORKER_NAME,WORKER_SURNAME,max_date = max(datetime_stamp)
     from TSDC_USER_TABLECHECK
     where datetime_stamp = 
       ( select max_date = max(datetime_stamp) from TSDC_USER_TABLECHECK
          where TABLE_CHECK = '${fromdata.TABLE_CHECK}'
          group by TABLE_CHECK)
      and  TABLE_CHECK = '${fromdata.TABLE_CHECK}'
       group by TABLE_CHECK,PIN_CODE,USER_NAME,WORKER_NAME,WORKER_SURNAME   
       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,

                    };
                    res.json(dataout);
                }
            }
        });
    });
});

app.post('/insert_user_tablecheck', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    console.log('insert_user_tablecheck');
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `  
        
			   insert into TSDC_USER_TABLECHECK
               (  [TABLE_CHECK]
                ,[USER_NAME]
                ,[WORKER_NAME]
                ,[WORKER_SURNAME]
                ,[WORKER_COMPANY]
                ,[PIN_CODE]
                ,[DATETIME_STAMP])
                select 
                 LTRIM(RTRIM('${fromdata.TABLE_CHECK}'))
                  ,t.USER_NAME 
                  ,t.WORKER_NAME
                  ,t.WORKER_SURNAME
                  ,t.WORKER_COMPANY
                  ,'${fromdata.PIN_CODE}'
                  ,getdate() 
                  
                 FROM [10.26.1.11].[TSDC_CONVEYOR].[DBO].[USER_PINCODE] t
                  where PIN_CODE = '${fromdata.PIN_CODE}'
      
           
     `;

        query += `
     
              
     select TABLE_CHECK,PIN_CODE,USER_NAME,WORKER_NAME,WORKER_SURNAME,max_date = max(datetime_stamp)
     from TSDC_USER_TABLECHECK
     where datetime_stamp = 
       ( select max_date = max(datetime_stamp) from TSDC_USER_TABLECHECK
          where TABLE_CHECK = '${fromdata.TABLE_CHECK}'
          group by TABLE_CHECK)
      and  TABLE_CHECK = '${fromdata.TABLE_CHECK}'
       group by TABLE_CHECK,PIN_CODE,USER_NAME,WORKER_NAME,WORKER_SURNAME

    `;

        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,

                    };
                    res.json(dataout);
                }
            }
        });
    });
});


app.post('/CheckWork_V2', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    console.log("CheckWork_V2:");
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `
        
     
            select  CONTAINER_ID , case
                        when len(CONTAINER_ID) = '20' then 'Normal'
                        when len(CONTAINER_ID) = '13' then 'Normal'
                        when len(CONTAINER_ID) < '5' then 'Online'
                        when len(CONTAINER_ID) < '10' then 'Sorter'
                        when len(CONTAINER_ID) = '10' then 'MASS'
                        when len(CONTAINER_ID) <= '17' then 'Online'
                        end WORK_TYPE
                        ,'${fromdata.USER_NAME}' as USER_NAME
                         from TSDC_PICK_CHECK_NEW
                        where CONTAINER_ID like '${fromdata.CONTAINER_ID}'
                           group by CONTAINER_ID
                       

       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,

                    };
                    res.json(dataout);
                }
            }
        });
    });
});




app.post('/CheckWork', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    console.log("CheckWork :");
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `
        
     
        select distinct CONTAINER_ID ,'${fromdata.USER_NAME}' as USER_NAME,ORDER_TYPE
         from TSDC_PICK_CHECK_NEW
        where   shipment_id = ( select distinct shipment_id from TSDC_CONTAINER_MAPORDER
                     WHERE  CONTAINER_ID = '${fromdata.CONTAINER_ID}')
        AND  SELLER_NO = ( select distinct SELLER_NO from TSDC_CONTAINER_MAPORDER
        WHERE  CONTAINER_ID = '${fromdata.CONTAINER_ID}')
                          
                       

       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,

                    };
                    res.json(dataout);
                }
            }
        });
    });
});



app.post('/CheckCon_Old', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    console.log("CheckCon_Old :");
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `

        select *,len(b.CONTAINER_ID) as CEN from (
            SELECT   shipment_id
                 ,sum(QTY_CHECK) as SUMCHECK

                ,CASE
WHEN (select sum(QTY_PICK) from TSDC_PICK_CHECK 
WHERE  CONTAINER_ID = '${fromdata.CONTAINER_ID}'
                 group by shipment_id)
< (select sum(QTY_PICK) from TSDC_PICK_CHECK 
 where shipment_id = ( select distinct shipment_id from TSDC_PICK_CHECK
                 WHERE  CONTAINER_ID = '${fromdata.CONTAINER_ID}')
                 group by shipment_id)
                 THEN sum(QTY_PICK)/
                 (select  count( distinct CONTAINER_ID) from TSDC_PICK_CHECK
                 WHERE  shipment_ID = (select distinct  shipment_id from TSDC_PICK_CHECK
                 WHERE CONTAINER_ID = '${fromdata.CONTAINER_ID}'))
ELSE sum(QTY_PICK)
END AS SUMCON
                 FROM   TSDC_PICK_CHECK
                 where shipment_id = ( select distinct shipment_id from TSDC_PICK_CHECK
                 WHERE  CONTAINER_ID = '${fromdata.CONTAINER_ID}')
                 group by shipment_id ) as a,
            (select  distinct RIGHT( brand, 3) AS reference_ID , CONTAINER_ID ,brand as USER_DEF5
            , SHIPMENT_ID as shipment 
       FROM TSDC_PICK_CHECK
       where CONTAINER_ID = '${fromdata.CONTAINER_ID}') as b,
       (select BILL_NO,STORE_NO,STORE_NAME,STORE_ADDRESS,CORNER_ID_BLH,BILL_N8_BLH,(FORMAT(BILL_DATE,'dd-MM-yyyy'))  as BILL_DATE,SITE_ID_BLH,BATCH_CODE,TRANSPORT_ID,TRANSPORT_NAME
            ,BRAND_NAME,MESSAGE_1,MESSAGE_2,MESSAGE_3
			from TSDC_PICK_PRINT_SHIP_DELIVERY ) as c
       where a.shipment_id = b.shipment 
	   and  (a.SHIPMENT_ID = c.BILL_N8_BLH or a.SHIPMENT_ID = c.BILL_NO)
       and a.shipment_id not in (
                                select 
                                    SHIPMENT_ID 
                                    from TSDC_PROCESS_ORDER_HEADER_ORDERPICK_PRINT  a
                                    where shipment_id in  (
                                    select distinct SHIPMENT_ID
                                    FROM TSDC_PICK_CHECK
                                    where CONTAINER_ID = '${fromdata.CONTAINER_ID}')
                                    )
               

            
       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null',
                        query: query,
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,
                        query: query,
                    };
                    res.json(dataout);
                }
            }
        });
    });
});

app.post('/CheckConOnline_Old', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    console.log("CheckConOnline_Old :");
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `
        select * ,len(a.CONTAINER_ID) as CEN from (
            SELECT   CONTAINER_ID
                 ,sum(QTY_CHECK) as SUMCHECK
               ,sum(QTY_PICK) as SUMCON
               ,shipment_id
                 FROM   TSDC_PICK_CHECK
                 WHERE  CONTAINER_ID = '${fromdata.CONTAINER_ID}'
                 group by CONTAINER_ID , shipment_id ) as a,
            (select  top 1  CONTAINER_ID ,BRAND as USER_DEF5
                FROM TSDC_PICK_CHECK
                where CONTAINER_ID = '${fromdata.CONTAINER_ID}'
                and BRAND is not null) as b
                where a.CONTAINER_ID = b.CONTAINER_ID 
      


            
       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null',
                        query: query,
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,
                    };
                    res.json(dataout);
                }
            }
        });
    });
});


app.post('/CheckConOffline', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    console.log("CheckConOffline :");
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `
        select *  from (
            SELECT sum(QTY_CHECK) as SUMCHECK
               ,sum(QTY_PICK) as SUMCON
               ,shipment_id
               ,SELLER_NO
               ,BRAND as USER_DEF5
                 FROM   TSDC_PICK_CHECK_NEW
                 WHERE SHIPMENT_ID = (select SHIPMENT_ID from TSDC_CONTAINER_MAPORDER where  CONTAINER_ID = '${fromdata.CONTAINER_ID}')
                 and SELLER_NO = (select SELLER_NO from TSDC_CONTAINER_MAPORDER where  CONTAINER_ID = '${fromdata.CONTAINER_ID}')
                 group by  shipment_id,SELLER_NO,BRAND ) as a,
			(select BILL_NO,STORE_NO,STORE_NAME,STORE_ADDRESS,CORNER_ID_BLH,BILL_N8_BLH,(FORMAT(BILL_DATE,'dd-MM-yyyy'))  as BILL_DATE,SITE_ID_BLH,BATCH_CODE,TRANSPORT_ID,TRANSPORT_NAME
            ,BRAND_NAME,MESSAGE_1,MESSAGE_2,MESSAGE_3
			from TSDC_PICK_PRINT_SHIP_DELIVERY ) as b
                where  (a.SHIPMENT_ID = b.BILL_N8_BLH or a.SHIPMENT_ID = b.BILL_NO)
				and a.SELLER_NO = b.STORE_NO
    
       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null',
                        query: query,
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,
                    };
                    res.json(dataout);
                }
            }
        });
    });
});


app.post('/CheckConSorter_Old', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    console.log("CheckConSorter_Old :");
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `
     
        select * ,len(a.CONTAINER_ID) as CEN from 
        (SELECT   CONTAINER_ID 
        ,sum(QTY_CHECK) as SUMCHECK
        ,sum(QTY_PICK) as SUMCON
               FROM   TSDC_PICK_CHECK
               WHERE  CONTAINER_ID = '${fromdata.CONTAINER_ID}'
               group by CONTAINER_ID ) as a,
               (select  distinct RIGHT( SHIPMENT_ID, 3) AS reference_ID , CONTAINER_ID as WORK_UNIT , SHIPMENT_ID as BATCH_CODE
               , '' as [PRODUCT_BHS] ,SHIPMENT_ID as [SORTER_BATCH_NO_BHS]
                      FROM TSDC_PICK_CHECK
               where CONTAINER_ID = '${fromdata.CONTAINER_ID}') as b 

where a.CONTAINER_ID = b.WORK_UNIT 


          
    
            
       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,
                    };
                    res.json(dataout);
                }
            }
        });
    });
});

app.post('/summaryCon_Old', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    console.log("summaryCon_Old :");
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `
    
        select ITEM_ID
        ,QTY_REQUESTED
        ,QTY_PICK
        ,sum(QTY_CHECK) as QTY_CHECK
        ,SHIPMENT_ID
        ,ITEM_ID_BARCODE
        ,UOM_PICK
        ,CASE
    WHEN sum(QTY_CHECK) <> QTY_PICK THEN '0'
    ELSE '1'
END AS STATUS_CHECK
        FROM TSDC_PICK_CHECK 
        where SHIPMENT_ID =  (select distinct shipment_ID from TSDC_PICK_CHECK
		where CONTAINER_ID = '${fromdata.CONTAINER_ID}') 
		group by shipment_ID , ITEM_ID ,UOM_PICK  ,QTY_REQUESTED
        ,QTY_PICK ,ITEM_ID_BARCODE
        order by STATUS_CHECK , QTY_CHECK
      
        
       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                        , query: query
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,
                        query: query
                    };
                    res.json(dataout);
                }
            }
        });
    });
});


app.post('/summaryConSorter_Old', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    console.log("summaryConSorter_Old :");
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `
     
        select ITEM_ID
        ,QTY_REQUESTED
        ,QTY_PICK
        ,sum(QTY_CHECK) as QTY_CHECK
        ,SHIPMENT_ID
        ,ITEM_ID_BARCODE
        ,UOM_PICK
        ,CASE
    WHEN QTY_CHECK <> QTY_PICK THEN '0'
    ELSE '1'
END AS STATUS_CHECK
        FROM TSDC_PICK_CHECK 
        where  CONTAINER_ID = '${fromdata.CONTAINER_ID}'
		group by shipment_ID , ITEM_ID   ,QTY_REQUESTED,UOM_PICK
        ,QTY_PICK , QTY_CHECK,ITEM_ID_BARCODE
        order by STATUS_CHECK , QTY_CHECK
        
       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,
                    };
                    res.json(dataout);
                }
            }
        });
    });
});

app.post('/matchItemInCon_Old', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    console.log("matchItemInCon_Old :");
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `
       
        SELECT   CONTAINER_ID
                ,ITEM_ID
                ,QTY_REQUESTED
                ,QTY_PICK 
                ,QTY_CHECK
				,FORMAT(TRANSACTION_DATE,'dd-MM-yyyy') as TRANSACTION_DATE
        FROM   TSDC_PICK_CHECK
        WHERE  
        
                CONTAINER_ID = '${fromdata.CONTAINER_ID}'
                AND  ITEM_ID_BARCODE = '${fromdata.ITEM_ID_BARCODE}'
       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'notfound'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,
                    };
                    res.json(dataout);
                }
            }
        });
    });
});

app.post('/matchItemInConSORTER_Old', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    console.log("matchItemInConSORTER_Old :");
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `
       
        SELECT   CONTAINER_ID
                ,ITEM_ID
                ,QTY_REQUESTED
                ,QTY_PICK 
                ,QTY_CHECK
				,FORMAT(TRANSACTION_DATE,'dd-MM-yyyy') as TRANSACTION_DATE
        FROM   TSDC_PICK_CHECK
        WHERE  
                CONTAINER_ID = '${fromdata.CONTAINER_ID}'
              AND  ITEM_ID_BARCODE = '${fromdata.ITEM_ID_BARCODE}'
       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'notfound'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,
                    };
                    res.json(dataout);
                }
            }
        });
    });
});

app.post('/checkEqualCon_Old', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    console.log("checkEqualCon_Old :");
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `        

        SELECT  
        ITEM_ID,
        QTY_PICK,
        (case
            when sum(QTY_CHECK) = QTY_PICK then 'equal'
            when sum(QTY_CHECK) > QTY_PICK then 'equal'
            else 'not_equal'
            end) as QTY_equal
       
        FROM   TSDC_PICK_CHECK
                
        where SHIPMENT_ID =  (select distinct shipment_ID from TSDC_PICK_CHECK
        where CONTAINER_ID = '${fromdata.CONTAINER_ID}') 
                
        AND  ITEM_ID_BARCODE = '${fromdata.ITEM_ID_BARCODE}'


       group by  ITEM_ID,QTY_PICK,SHIPMENT_ID
        
       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,
                    };
                    res.json(dataout);
                }
            }
        });
    });
});

app.post('/checkEqualConSorter_Old', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    console.log("checkEqualConSorter_Old :");
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `
        SELECT  CONTAINER_ID,
                    ITEM_ID,
                    QTY_REQUESTED,
                    QTY_PICK,
                    (case
                        when QTY_CHECK = QTY_PICK then 'equal'
                        when QTY_CHECK > QTY_PICK then 'equal'
                        else 'not_equal'
                        end) as QTY_equal
                   
            FROM   TSDC_PICK_CHECK
                    
            WHERE  
            CONTAINER_ID = '${fromdata.CONTAINER_ID}'
            AND  ITEM_ID_BARCODE = '${fromdata.ITEM_ID_BARCODE}'


            --SELECT  
            --        ITEM_ID,
            --        QTY_PICK,
            --        (case
            --            when sum(QTY_CHECK) = QTY_PICK then 'equal'
            --            when sum(QTY_CHECK) > QTY_PICK then 'equal'
            --            else 'not_equal'
            --            end) as QTY_equal
                   
            --FROM   TSDC_PICK_CHECK_NEW   
            --where  CONTAINER_ID = '${fromdata.CONTAINER_ID}'
            --AND  ITEM_ID_BARCODE =  '${fromdata.ITEM_ID_BARCODE}'
            
            --       group by  ITEM_ID,QTY_PICK,SHIPMENT_ID,SELLER_
        
       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,
                    };
                    res.json(dataout);
                }
            }
        });
    });
});

app.post('/updateConQtyCheck_Old', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    console.log('updateConQtyCheck_Old');
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `  

        UPDATE  TSDC_PICK_CHECK
        SET		QTY_CHECK = QTY_CHECK + 1 ,  
        TABLE_CHECK = '${fromdata.TABLE_CHECK}', 
        USER_CHECK = '${fromdata.USER_NAME}',
		END_DATE_TIME = getdate() , 
		START_DATE_TIME = (case when QTY_CHECK = 0 then GETDATE() else START_DATE_TIME end)
        where   CONTAINER_ID = '${fromdata.CONTAINER_ID}'
       and  ITEM_ID_BARCODE = '${fromdata.ITEM_ID_BARCODE}'
            and QTY_CHECK < QTY_PICK
   
     `;


        return pool.request().query(query, function (err_query) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query,
                    query: query
                };
                res.json(dataout);
            } else {
                dataout = {
                    status: 'success',
                    query: query
                };
                res.json(dataout);
            }
            sql.close();
        });
    });
});

app.post('/updateConQtyCheck_Old_full', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    console.log('updateConQtyCheck_Old_full');
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `  

        UPDATE  TSDC_PICK_CHECK
        SET		QTY_CHECK = QTY_CHECK + ${fromdata.QTY} ,  
        TABLE_CHECK = '${fromdata.TABLE_CHECK}', 
        USER_CHECK = '${fromdata.USER_NAME}',
		END_DATE_TIME = getdate() , 
		START_DATE_TIME = (case when QTY_CHECK = 0 then GETDATE() else START_DATE_TIME end)
        where   CONTAINER_ID = '${fromdata.CONTAINER_ID}'
       and  ITEM_ID_BARCODE = '${fromdata.ITEM_ID_BARCODE}'
            and QTY_CHECK < QTY_PICK
   
     `;


        return pool.request().query(query, function (err_query) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query,
                    query: query
                };
                res.json(dataout);
            } else {
                dataout = {
                    status: 'success',
                    query: query
                };
                res.json(dataout);
            }
            sql.close();
        });
    });
});

app.post('/updateCoverSheet', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    console.log('updateCoverSheet');
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `  
  
        UPDATE  TSDC_PICK_CHECK_NEW
        SET	CHECK_DATE = getdate()	
        where   SHIPMENT_ID =  '${fromdata.shipment_id}'
        and SELLER_NO =  '${fromdata.SELLER_NO}';

        update TSDC_PICK_PRINT_SHIP_DELIVERY
        set CARTON_NO = '${fromdata.MaxBox_NO}'
        ,PRINT_STATUS = 'Y'
        where (BILL_N8_BLH = '${fromdata.shipment_id}' or BILL_NO = '${fromdata.shipment_id}')  
        and STORE_NO = '${fromdata.SELLER_NO}'
   
     `;


        return pool.request().query(query, function (err_query) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query,
                    query: query
                };
                res.json(dataout);
            } else {
                dataout = {
                    status: 'success',
                    query: query
                };
                res.json(dataout);
            }
            sql.close();
        });
    });
});

app.post('/updateConQtyCheck_SORTER', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    console.log('updateConQtyCheck_SORTER');
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `  

        UPDATE  TSDC_PICK_CHECK_NEW
        SET		QTY_CHECK = QTY_CHECK + 1 
        ,   USER_CHECK = '${fromdata.USER_NAME}'
         , END_DATE_TIME = getdate() , 
		START_DATE_TIME = (case when QTY_CHECK = 0 then GETDATE() else START_DATE_TIME end),
        TABLE_CHECK = '${fromdata.TABLE_CHECK}'
        where     CONTAINER_ID = '${fromdata.CONTAINER_ID}'
        AND  ITEM_ID_BARCODE = '${fromdata.ITEM_ID_BARCODE}'
        and QTY_CHECK < QTY_PICK
   
     `;


        query += `

     insert into [TSDC_PICK_CHECK_LOG_NEW]
     select CONTAINER_ID,ITEM_ID,QTY_CHECK,GETDATE(),'${fromdata.USER_NAME}' as USER_NAME ,SHIPMENT_ID ,'${fromdata.TABLE_CHECK}' as TABLE_CHECK from (
  
  select CONTAINER_ID,ITEM_ID,'1' as QTY_CHECK ,GETDATE() as DATE_TIME_STAMP,SHIPMENT_ID ,TABLE_CHECK from TSDC_PICK_CHECK_NEW
  where   CONTAINER_ID = '${fromdata.CONTAINER_ID}'
      AND  ITEM_ID_BARCODE = '${fromdata.ITEM_ID_BARCODE}'
  
     ) as a
    
`;

        return pool.request().query(query, function (err_query) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query,
                    query: query
                };
                res.json(dataout);
            } else {
                dataout = {
                    status: 'success',
                    query: query
                };
                res.json(dataout);
            }
            sql.close();
        });
    });
});


app.post('/updateConQtyCheck_SORTER_fullcarton', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    console.log('updateConQtyCheck_SORTER_fullcarton');
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `  

        UPDATE  TSDC_PICK_CHECK_NEW
        SET		QTY_CHECK = QTY_CHECK +  '${fromdata.QTY}'
        ,   USER_CHECK = '${fromdata.USER_NAME}'
         , END_DATE_TIME = getdate() , 
		START_DATE_TIME = (case when QTY_CHECK = 0 then GETDATE() else START_DATE_TIME end),
        TABLE_CHECK = '${fromdata.TABLE_CHECK}'
        where      shipment_id = ( select distinct shipment_id from TSDC_CONTAINER_MAPORDER
            WHERE  CONTAINER_ID = '${fromdata.CONTAINER_ID}')
AND  SELLER_NO = ( select distinct SELLER_NO from TSDC_CONTAINER_MAPORDER
WHERE  CONTAINER_ID = '${fromdata.CONTAINER_ID}')
        AND  ITEM_ID_BARCODE = '${fromdata.ITEM_ID_BARCODE}'
        and QTY_CHECK < QTY_PICK
   
     `;


        query += `

     insert into [TSDC_PICK_CHECK_LOG_NEW]
     select CONTAINER_ID,ITEM_ID,QTY_CHECK,GETDATE(),'${fromdata.USER_NAME}' as USER_NAME ,SHIPMENT_ID ,'${fromdata.TABLE_CHECK}' as TABLE_CHECK from (
  
  select CONTAINER_ID,ITEM_ID,'${fromdata.QTY}' as QTY_CHECK ,GETDATE() as DATE_TIME_STAMP,SHIPMENT_ID ,TABLE_CHECK from TSDC_PICK_CHECK_NEW
  where   CONTAINER_ID = '${fromdata.CONTAINER_ID}'
      AND  ITEM_ID_BARCODE = '${fromdata.ITEM_ID_BARCODE}'
  
     ) as a
    
`;

        return pool.request().query(query, function (err_query) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query,
                    query: query
                };
                res.json(dataout);
            } else {
                dataout = {
                    status: 'success',
                    query: query
                };
                res.json(dataout);
            }
            sql.close();
        });
    });
});


app.post('/updateConQtyCheck_fullcarton', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    console.log('updateConQtyCheck_fullcarton');
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `  

        UPDATE  TSDC_PICK_CHECK_NEW
        SET		QTY_CHECK = QTY_CHECK + '${fromdata.QTY}' 
        ,   USER_CHECK = '${fromdata.USER_NAME}' , END_DATE_TIME = getdate() , 
		START_DATE_TIME = (case when QTY_CHECK = 0 then GETDATE() else START_DATE_TIME end),
        TABLE_CHECK = '${fromdata.TABLE_CHECK}'
        where   shipment_id = ( select distinct shipment_id from TSDC_CONTAINER_MAPORDER
                    WHERE  CONTAINER_ID = '${fromdata.CONTAINER_ID}')
        AND  SELLER_NO = ( select distinct SELLER_NO from TSDC_CONTAINER_MAPORDER
        WHERE  CONTAINER_ID = '${fromdata.CONTAINER_ID}')

            AND  ITEM_ID_BARCODE = '${fromdata.ITEM_ID_BARCODE}'
            and QTY_CHECK < QTY_PICK
   
     `;


        query += `

     insert into [TSDC_PICK_CHECK_LOG_NEW]
     select CONTAINER_ID,ITEM_ID,QTY_CHECK,GETDATE(),'${fromdata.USER_NAME}' as USER_NAME,SHIPMENT_ID ,'${fromdata.TABLE_CHECK}' as TABLE_CHECK from (
  
  select CONTAINER_ID,ITEM_ID,'${fromdata.QTY}'  as QTY_CHECK ,GETDATE() as DATE_TIME_STAMP,SHIPMENT_ID ,TABLE_CHECK from TSDC_PICK_CHECK_NEW
  where   CONTAINER_ID = '${fromdata.CONTAINER_ID}'
      AND  ITEM_ID_BARCODE = '${fromdata.ITEM_ID_BARCODE}'
  
     ) as a
    
`;

        return pool.request().query(query, function (err_query) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query,
                    query: query
                };
                res.json(dataout);
            } else {
                dataout = {
                    status: 'success',
                    query: query
                };
                res.json(dataout);
            }
            sql.close();
        });
    });
});


app.post('/BOX_CONTROL_DETAIL', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    console.log("BOX_CONTROL :");
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `        

        select * from  TSDC_PICK_CHECK_BOX_CONTROL_DETAIL_NEW
        where REF_INDEX is null
        and TABLE_CHECK = '${fromdata.TABLE_CHECK}'
        and PO_NO = '${fromdata.shipment_id}'
        AND SELLER_NO = '${fromdata.SELLER_NO}'
        and ITEM_ID_BARCODE = '${fromdata.ITEM_ID_BARCODE}'      
       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {

                    var query = `        
                            
                            INSERT INTO TSDC_PICK_CHECK_BOX_CONTROL_DETAIL_NEW
                                ([REF_INDEX]
                                ,[CONTAINERID]
                                ,[PO_NO]
                                ,SELLER_NO
                                ,[BOX_NO_ORDER]
                                ,[ITEM_ID]
                                ,[QTY]
                                ,[USER_CHECK]
                                ,[TABLE_CHECK]
                                ,[ITEM_ID_BARCODE])
                            VALUES
                                (NULL
                                ,'${fromdata.CONTAINER_ID}'
                                ,'${fromdata.shipment_id}'
                                ,'${fromdata.SELLER_NO}'
                                ,NULL
                                ,'${fromdata.ITEM_ID}'
                                ,1
                                ,'${fromdata.PIN_CODE}'
                                ,LTRIM(RTRIM('${fromdata.TABLE_CHECK}'))
                                ,'${fromdata.ITEM_ID_BARCODE}')

                        `;
                    return pool.request().query(query, function (err_query) {
                        if (err_query) {
                            dataout = {
                                status: 'error insert BOX_CONTROL_detail',
                                member: err_query,
                                query: query
                            };
                            res.json(dataout);
                        } else {
                            dataout = {
                                status: 'success',
                                query: query
                            };
                            res.json(dataout);
                        }
                        sql.close();
                    });

                } else {
                    var query = `
                    update TSDC_PICK_CHECK_BOX_CONTROL_DETAIL_NEW
                    set QTY = QTY+1
                    where   REF_INDEX is null
                    and TABLE_CHECK = '${fromdata.TABLE_CHECK}'
                    and PO_NO = '${fromdata.shipment_id}'
                    AND SELLER_NO = '${fromdata.SELLER_NO}'
                    and ITEM_ID_BARCODE = '${fromdata.ITEM_ID_BARCODE}' 
                    and QTY < '${fromdata.check_QTY_PICK}' 
                     `;
                    return pool.request().query(query, function (err_query) {
                        if (err_query) {
                            dataout = {
                                status: 'error update BOX_CONTROL_detail',
                                member: err_query,
                                query: query
                            };
                            res.json(dataout);
                        } else {
                            dataout = {
                                status: 'success',
                                query: query
                            };
                            res.json(dataout);
                        }
                        sql.close();
                    });
                }
            }
        });
    });
});

app.post('/BOX_CONTROL_DETAIL_FULLCARTON', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    console.log("BOX_CONTROL_DETAIL_FULLCARTON :");
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `        

        select * from  TSDC_PICK_CHECK_BOX_CONTROL_DETAIL_NEW
        where REF_INDEX is null
        and PO_NO = '${fromdata.shipment_id}'
        AND SELLER_NO = '${fromdata.SELLER_NO}'
        and ITEM_ID_BARCODE = '${fromdata.ITEM_ID_BARCODE}'      
       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {

                    var query = `        
                            
                            INSERT INTO TSDC_PICK_CHECK_BOX_CONTROL_DETAIL_NEW
                                ([REF_INDEX]
                                ,[CONTAINERID]
                                ,[PO_NO]
                                ,SELLER_NO
                                ,[BOX_NO_ORDER]
                                ,[ITEM_ID]
                                ,[QTY]
                                ,[USER_CHECK]
                                ,[TABLE_CHECK]
                                ,[ITEM_ID_BARCODE])
                            VALUES
                                (NULL
                                ,'${fromdata.CONTAINER_ID}'
                                ,'${fromdata.shipment_id}'
                                ,'${fromdata.SELLER_NO}'
                                ,NULL
                                ,'${fromdata.ITEM_ID}'
                                ,'${fromdata.QTY}'
                                ,'${fromdata.PIN_CODE}'
                                ,'${fromdata.TABLE_CHECK}'
                                ,'${fromdata.ITEM_ID_BARCODE}')

                        `;
                    return pool.request().query(query, function (err_query) {
                        if (err_query) {
                            dataout = {
                                status: 'error insert BOX_CONTROL_detail',
                                member: err_query,
                                query: query
                            };
                            res.json(dataout);
                        } else {
                            dataout = {
                                status: 'success',
                                query: query
                            };
                            res.json(dataout);
                        }
                        sql.close();
                    });

                } else {
                    var query = `
                    update TSDC_PICK_CHECK_BOX_CONTROL_DETAIL_NEW
                    set QTY = QTY+ '${fromdata.QTY}' 
                    where   REF_INDEX is null
                    and TABLE_CHECK = '${fromdata.TABLE_CHECK}'
                    and PO_NO = '${fromdata.shipment_id}'
                    AND SELLER_NO = '${fromdata.SELLER_NO}'
                    and ITEM_ID_BARCODE = '${fromdata.ITEM_ID_BARCODE}' 
                     `;
                    return pool.request().query(query, function (err_query) {
                        if (err_query) {
                            dataout = {
                                status: 'error update BOX_CONTROL_detail',
                                member: err_query,
                                query: query
                            };
                            res.json(dataout);
                        } else {
                            dataout = {
                                status: 'success',
                                query: query
                            };
                            res.json(dataout);
                        }
                        sql.close();
                    });
                }
            }
        });
    });
});


app.post('/check_master_box', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    console.log("checkEqual :");
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `        

        select *
        from [10.26.1.11].[TSDC_Conveyor].[dbo].[TSDC_MASTER_CARTON_BOX_SIZE]
        --from TSDC_MASTER_CARTON_BOX_SIZE
        where CARTON_NAME = '${fromdata.BOX_SIZE}'
        
       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,
                    };
                    res.json(dataout);
                }
            }
        });
    });
});


app.get('/tsdc_pick_vas', function (req, res) {
    console.log("tsdc_pick_vas :");
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `        

        select * from tsdc_pick_vas
        order by  vas_name asc
        
       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,
                    };
                    res.json(dataout);
                }
            }
        });
    });
});

app.post('/tracksum_qty_Old', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    console.log("tracksum_qty_Old :");
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `        

        select sum(qty_check) as TRACKSUM_QTY
        from TSDC_PICK_CHECK
        where  shipment_id = '${fromdata.shipment_id}'
        
       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,
                        query: query
                    };
                    res.json(dataout);
                }
            }
        });
    });
});

app.post('/tracksum_qty_Sorter_Old', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    console.log("tracksum_qty_Sorter_Old :");
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `        

        select sum(qty_check) as TRACKSUM_QTY
        from TSDC_PICK_CHECK
        where  CONTAINER_ID = '${fromdata.CONTAINER_ID}'
        
       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,
                        query: query
                    };
                    res.json(dataout);
                }
            }
        });
    });
});


app.post('/tracking_running_Old', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    console.log('tracking_running_Old');
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `  

        update TSDC_PICK_CHECK_BOX_CONTROL_NEW
        set VAS_NAME_10 = 'C'
        where PO_NO = '${fromdata.shipment_id}'
        and SELLER_NO = '${fromdata.SELLER_NO}';

        declare @TABLE_RUNNING numeric(18)
        declare @BOX_NO_ORDER numeric(18)
        declare @REF_INDEX  varchar(13)
        declare @YY char(2)
        declare @MM char(2)
        declare @DD char(2)
        declare @count  numeric(3)

			set @count = 1; 

			WHILE @count <= ${fromdata.BOX_NUM}
            BEGIN
            set @YY = (select right(YEAR(getdate()),2)) 
            set @MM = (select FORMAT(getdate(),'MM'))
            set @DD = (select FORMAT(getdate(),'dd'))
            set @TABLE_RUNNING = (SELECT CASE WHEN (SELECT MAX(TABLE_RUNNING) FROM TSDC_PICK_CHECK_BOX_CONTROL_NEW  WHERE TABLE_CHECK = '${fromdata.TABLE_CHECK}' AND SUBSTRING(REF_INDEX,4,6) = CONVERT(date,getdate())) is NULL THEN 1
                                ELSE (SELECT MAX(TABLE_RUNNING) FROM TSDC_PICK_CHECK_BOX_CONTROL_NEW  WHERE TABLE_CHECK = '${fromdata.TABLE_CHECK}' AND SUBSTRING(REF_INDEX,4,6) = CONVERT(date,getdate()) )+1
                                END TABLE_RUNNING )

            set @BOX_NO_ORDER = @count
            SET @REF_INDEX      = (SELECT  LTRIM(RTRIM('${fromdata.TABLE_CHECK}'))+@YY+@MM+@DD
                                + case WHEN @TABLE_RUNNING is NULL THEN '0001'
                                    when len(@TABLE_RUNNING) = 1 then '000'+ CONVERT(nvarchar,@TABLE_RUNNING)
                                    when len(@TABLE_RUNNING) = 2 then '00'+ CONVERT(nvarchar,@TABLE_RUNNING)
                                    when len(@TABLE_RUNNING) = 3 then '0'+ CONVERT(nvarchar,@TABLE_RUNNING)
                                    when len(@TABLE_RUNNING) = 4 then  CONVERT(nvarchar,@TABLE_RUNNING)
                                end REF_INDEX )

            insert into TSDC_PICK_CHECK_BOX_CONTROL_NEW
                ( REF_INDEX
                ,CONTAINERID
                ,PO_NO
                ,SELLER_NO
                ,QTY
                ,BOX_NO_ORDER
                ,TABLE_CHECK
                ,TABLE_RUNNING
                ,USER_CHECK
                ,BOX_SIZE
                ,WEIGHT
                ,WIDTH
                ,HIGH
                ,DEEP
                ,TRANSPORT
                ,TRACKING
                ,SORTCODE
                ,SORTINGLINECODE
                ,STORENAME
                ,CUST_NAME
                ,CUST_ADDRESS
                ,CUST_TEL
                ,PICKUP_DATE
                ,PRINT_DATE
                ,CREATE_DATE
                ,REPRINT_DATE
                ,CODTYPE
                ,CODTOTAL
                ,VAS_NAME_01
                ,VAS_NAME_02
                ,VAS_NAME_03
                ,VAS_NAME_04
                ,VAS_NAME_05
                ,VAS_NAME_06
                ,VAS_NAME_07
                ,VAS_NAME_08
                ,VAS_NAME_09
                ,VAS_NAME_10
                )
                select 
                @REF_INDEX 
                ,'${fromdata.CONTAINER_ID}'
                ,'${fromdata.shipment_id}'
                ,'${fromdata.SELLER_NO}'
                ,1 AS QTY
                , @BOX_NO_ORDER 
                ,LTRIM(RTRIM('${fromdata.TABLE_CHECK}'))
                ,@TABLE_RUNNING
                ,'${fromdata.PIN_CODE}'
                ,'${fromdata.BOX_SIZE}'
                ,0 as CARTON_BOX_WEIGHT
                ,0 as CARTON_BOX_W
                ,0 as CARTON_BOX_H
                ,0 as CARTON_BOX_L
                ,'TRANSPORT'
                ,'TRACKING'
                ,'SORTCODE'
                ,'SORTINGLINECODE'
                ,'STORENAME'
                ,'${fromdata.SHIPPING_NAME}'
                ,'CUST_ADDRESS'
                ,'CUST_TEL'
                ,getdate()
                ,getdate()
                ,getdate()
                ,getdate()
                ,'N'
                ,0
                --,'${fromdata.VAS_NAME_01}'
                --,'${fromdata.VAS_NAME_02}'
                --,'${fromdata.VAS_NAME_03}'
                --,'${fromdata.VAS_NAME_04}'
                --,'${fromdata.VAS_NAME_05}'
                --,'${fromdata.VAS_NAME_06}'
                --,'${fromdata.VAS_NAME_07}'
                --,'${fromdata.VAS_NAME_08}'
                --,'${fromdata.VAS_NAME_09}'
                ,''
                ,''
                ,''
                ,''
                ,''
                ,''
                ,''
                ,''
                ,''
                ,''

            SET @count = @count + 1;

            END;
 `;
        
        return pool.request().query(query, function (err_query) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    //member: err_query,
                    query: query
                };
                res.json(dataout);
            } else {
                var query2 = `        

                select REF_INDEX
                        ,BOX_NO_ORDER
                        ,TABLE_RUNNING
                        ,PO_NO
                        ,SELLER_NO
                from  TSDC_PICK_CHECK_BOX_CONTROL_NEW
                where TABLE_CHECK = '${fromdata.TABLE_CHECK}'
                and PO_NO = '${fromdata.shipment_id}'
                AND SELLER_NO = '${fromdata.SELLER_NO}'
                and VAS_NAME_10 !=  'C'
                
               `;
                return pool.request().query(query2, function (err_query, recordset) {
                    if (err_query) {
                        dataout = {
                            status: 'error',
                            data: err_query,
                            query: query2,
                        };
                        res.json(dataout);
                    } else {
                        var data = recordset.recordset;
                        if (recordset.recordset.length === 0) {
                            dataout = {
                                status: 'null'
                            };
                            res.json(dataout);
                        } else {
                            dataout = {
                                status: 'success',
                                data: data,
                                query: query
                            };
                            res.json(dataout);
                        }
                    }
                });
            }
            sql.close();
        });
    });
});


app.post('/tracking_running_Old2', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    console.log('tracking_running_Old2');
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `  

        update TSDC_PICK_CHECK_BOX_CONTROL_NEW
        set VAS_NAME_10 = 'C'
        where PO_NO = '${fromdata.shipment_id}'
        and SELLER_NO = '${fromdata.SELLER_NO}';

        declare @TABLE_RUNNING numeric(18)
        declare @BOX_NO_ORDER numeric(18)
        declare @REF_INDEX  varchar(13)
        declare @YY char(2)
        declare @MM char(2)
        declare @DD char(2)
        declare @count  numeric(3)
        declare @count_size  numeric(3)

			set @count = 1; `;

        fromdata.listbox.forEach(function (element) {
            query += ` set @count_size = 1;  
			WHILE @count_size <= ${element.Qty}
            BEGIN
            set @YY = (select right(YEAR(getdate()),2)) 
            set @MM = (select FORMAT(getdate(),'MM'))
            set @DD = (select FORMAT(getdate(),'dd'))
            set @TABLE_RUNNING = (SELECT CASE WHEN (SELECT MAX(TABLE_RUNNING) FROM TSDC_PICK_CHECK_BOX_CONTROL_NEW  WHERE TABLE_CHECK = '${fromdata.TABLE_CHECK}' AND SUBSTRING(REF_INDEX,4,6) = CONVERT(date,getdate())) is NULL THEN 1
                                ELSE (SELECT MAX(TABLE_RUNNING) FROM TSDC_PICK_CHECK_BOX_CONTROL_NEW  WHERE TABLE_CHECK = '${fromdata.TABLE_CHECK}' AND SUBSTRING(REF_INDEX,4,6) = CONVERT(date,getdate()) )+1
                                END TABLE_RUNNING )

            set @BOX_NO_ORDER = @count
            SET @REF_INDEX      = (SELECT  LTRIM(RTRIM('${fromdata.TABLE_CHECK}'))+@YY+@MM+@DD
                                + case WHEN @TABLE_RUNNING is NULL THEN '0001'
                                    when len(@TABLE_RUNNING) = 1 then '000'+ CONVERT(nvarchar,@TABLE_RUNNING)
                                    when len(@TABLE_RUNNING) = 2 then '00'+ CONVERT(nvarchar,@TABLE_RUNNING)
                                    when len(@TABLE_RUNNING) = 3 then '0'+ CONVERT(nvarchar,@TABLE_RUNNING)
                                    when len(@TABLE_RUNNING) = 4 then  CONVERT(nvarchar,@TABLE_RUNNING)
                                end REF_INDEX )

            insert into TSDC_PICK_CHECK_BOX_CONTROL_NEW
                ( REF_INDEX
                ,CONTAINERID
                ,PO_NO
                ,SELLER_NO
                ,QTY
                ,BOX_NO_ORDER
                ,TABLE_CHECK
                ,TABLE_RUNNING
                ,USER_CHECK
                ,BOX_SIZE
                ,WEIGHT
                ,WIDTH
                ,HIGH
                ,DEEP
                ,TRANSPORT
                ,TRACKING
                ,SORTCODE
                ,SORTINGLINECODE
                ,STORENAME
                ,CUST_NAME
                ,CUST_ADDRESS
                ,CUST_TEL
                ,PICKUP_DATE
                ,PRINT_DATE
                ,CREATE_DATE
                ,REPRINT_DATE
                ,CODTYPE
                ,CODTOTAL
                ,VAS_NAME_01
                ,VAS_NAME_02
                ,VAS_NAME_03
                ,VAS_NAME_04
                ,VAS_NAME_05
                ,VAS_NAME_06
                ,VAS_NAME_07
                ,VAS_NAME_08
                ,VAS_NAME_09
                ,VAS_NAME_10
                )
                select 
                @REF_INDEX 
                ,'${fromdata.CONTAINER_ID}'
                ,'${fromdata.shipment_id}'
                ,'${fromdata.SELLER_NO}'
                ,1 AS QTY
                , @BOX_NO_ORDER 
                ,LTRIM(RTRIM('${fromdata.TABLE_CHECK}'))
                ,@TABLE_RUNNING
                ,'${fromdata.PIN_CODE}'
                ,'${element.Boxid}'
                ,'${element.CARTON_BOX_WEIGHT}' as CARTON_BOX_WEIGHT
                ,'${element.CARTON_BOX_W}' as CARTON_BOX_W
                ,'${element.CARTON_BOX_H}' as CARTON_BOX_H
                ,'${element.CARTON_BOX_L}' as CARTON_BOX_L
                ,'TRANSPORT'
                ,'TRACKING'
                ,'SORTCODE'
                ,'SORTINGLINECODE'
                ,'STORENAME'
                ,'${fromdata.SHIPPING_NAME}'
                ,'CUST_ADDRESS'
                ,'CUST_TEL'
                ,getdate()
                ,getdate()
                ,getdate()
                ,getdate()
                ,'N'
                ,0
                --,'${fromdata.VAS_NAME_01}'
                --,'${fromdata.VAS_NAME_02}'
                --,'${fromdata.VAS_NAME_03}'
                --,'${fromdata.VAS_NAME_04}'
                --,'${fromdata.VAS_NAME_05}'
                --,'${fromdata.VAS_NAME_06}'
                --,'${fromdata.VAS_NAME_07}'
                --,'${fromdata.VAS_NAME_08}'
                --,'${fromdata.VAS_NAME_09}'
                ,''
                ,''
                ,''
                ,''
                ,''
                ,''
                ,''
                ,''
                ,''
                ,''

            SET @count = @count + 1;
            SET @count_size = @count_size + 1;
            END;
            `
        });
        
        return pool.request().query(query, function (err_query) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query,
                    query: query
                };
                res.json(dataout);
            } else {
                var query2 = `        

                select REF_INDEX
                        ,BOX_NO_ORDER
                        ,TABLE_RUNNING
                        ,PO_NO
                        ,SELLER_NO
                        ,BOX_SIZE
                from  TSDC_PICK_CHECK_BOX_CONTROL_NEW
                where TABLE_CHECK = '${fromdata.TABLE_CHECK}'
                and PO_NO = '${fromdata.shipment_id}'
                AND SELLER_NO = '${fromdata.SELLER_NO}'
                and VAS_NAME_10 !=  'C'
                
               `;
                return pool.request().query(query2, function (err_query, recordset) {
                    if (err_query) {
                        dataout = {
                            status: 'error',
                            //data: err_query,
                            query: query2,
                        };
                        res.json(dataout);
                    } else {
                        var data = recordset.recordset;
                        if (recordset.recordset.length === 0) {
                            dataout = {
                                status: 'null',
                                query: query
                            };
                            res.json(dataout);
                        } else {
                            dataout = {
                                status: 'success',
                                data: data,
                                query: query
                            };
                            res.json(dataout);
                        }
                    }
                });
            }
            sql.close();
        });
    });
});




app.post('/loadTracking', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    console.log("loadTracking :");
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `

        select *,(select    max(BOX_NO_ORDER)  MaxBox_NO
        from TSDC_PICK_CHECK_BOX_CONTROL_NEW
        where PO_NO  = '${fromdata.shipment_id}'
        AND SELLER_NO = '${fromdata.SELLER_NO}') as MaxBox_NO
         from TSDC_PICK_CHECK_BOX_CONTROL_NEW
        where po_no = '${fromdata.shipment_id}'
        and SELLER_NO =  '${fromdata.SELLER_NO}'
        order by CREATE_DATE 
               

            
       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null',
                        query: query,
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,
                        query: query,
                    };
                    res.json(dataout);
                }
            }
        });
    });
});

app.post('/summary_ITEM_LACK_Old', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    console.log("summary_ITEM_LACK_Old :");
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `

       
        select ITEM_ID
        ,'' as CONTAINER_ID
      ,QTY_REQUESTED
      ,QTY_PICK
      ,sum(QTY_CHECK) as QTY_CHECK
      ,(QTY_PICK -sum(QTY_CHECK)) as QTY_LACK
      ,a.SHIPMENT_ID
      ,(FORMAT(GETDATE(),'dd-MM-yyyy ') 
      + CONVERT(VARCHAR(5),CONVERT(DATETIME, GETDATE() , 0), 108) )as TO_DAY
      ,STORE_NO
      ,STORE_NAME
      ,CORNER_ID_BLH
      ,(FORMAT(BILL_DATE,'dd-MM-yyyy'))  as ORDER_DATE
        FROM TSDC_PICK_CHECK  a , TSDC_PICK_PRINT_SHIP_DELIVERY b
      where a.SHIPMENT_ID =  '${fromdata.shipment_id}'
        and a.SHIPMENT_ID = b.BILL_N8_BLH
      group by a.shipment_ID , ITEM_ID   ,QTY_REQUESTED ,QTY_PICK ,STORE_NO
      ,STORE_NAME
      ,BILL_DATE
      ,CORNER_ID_BLH
      HAVING (sum(QTY_CHECK) - QTY_PICK) <> '0'
                
    
       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null',
                        data: err_query
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,
                        query: query
                    };
                    res.json(dataout);
                }
            }
        });
    });
});

app.post('/summary_ITEM_LACK_SORTER_Old', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    console.log("summary_ITEM_LACK_SORTER_Old :" );
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `
     
        select 
        CONTAINER_ID
        ,ITEM_ID
     ,QTY_REQUESTED
     ,QTY_PICK
     ,sum(QTY_CHECK) as QTY_CHECK
     ,(QTY_PICK -sum(QTY_CHECK)) as QTY_LACK
     ,SHIPMENT_ID
     ,(FORMAT(GETDATE(),'dd-MM-yyyy ') 
     + CONVERT(VARCHAR(5),CONVERT(DATETIME, GETDATE() , 0), 108) )as TO_DAY
     FROM TSDC_PICK_CHECK 
     where  CONTAINER_ID = '${fromdata.CONTAINER_ID}'
     group by shipment_ID , ITEM_ID   ,QTY_REQUESTED
     ,QTY_PICK , QTY_CHECK , CONTAINER_ID
     HAVING (sum(QTY_CHECK) - QTY_PICK) <> '0'

     
	
       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,
                    };
                    res.json(dataout);
                }
            }
        });
    });
});

app.post('/CheckCon_Orderconfirm', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    console.log("CheckCon_Orderconfirm :");
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `

        select *  from (
            SELECT  sum(QTY_CHECK) as SUMCHECK
               ,sum(QTY_PICK) as SUMCON
               ,shipment_id
               ,SELLER_NO
               ,BRAND as USER_DEF5
                 FROM   TSDC_PICK_CHECK_NEW
                 WHERE SHIPMENT_ID = (select SHIPMENT_ID from TSDC_CONTAINER_MAPORDER where  CONTAINER_ID = '${fromdata.CONTAINER_ID}')
                 and SELLER_NO = (select SELLER_NO from TSDC_CONTAINER_MAPORDER where  CONTAINER_ID = '${fromdata.CONTAINER_ID}')
                 group by  shipment_id,SELLER_NO,BRAND ) as a,
			(select BILL_NO,STORE_NO,STORE_NAME,STORE_ADDRESS,CORNER_ID_BLH,BILL_N8_BLH,(FORMAT(BILL_DATE,'dd-MM-yyyy'))  as BILL_DATE,SITE_ID_BLH,BATCH_CODE,TRANSPORT_ID,TRANSPORT_NAME
            ,BRAND_NAME,MESSAGE_1,MESSAGE_2,MESSAGE_3
			from TSDC_PICK_PRINT_SHIP_DELIVERY ) as b
			,(
				select SHIPMENT_ID as SHIPMENT_ID_STS, 'S' as STATUS_DATA,SHIP_TO from TSDC_PICK_CHECK_CONFIRM_ORDER
			 where SHIPMENT_ID in  (
			 select distinct SHIPMENT_ID
				FROM TSDC_PICK_CHECK_NEW
			 where CONTAINER_ID = '${fromdata.CONTAINER_ID}'
			 )

			 union all 

			  select 
			 SHIPMENT_ID as  SHIPMENT_ID_STS, 'N' as STATUS_DATA,SHIP_TO
			 from TSDC_PROCESS_ORDER_HEADER_ORDERPICK_PRINT  a
			  where shipment_id in  (
			 select distinct SHIPMENT_ID
				FROM TSDC_PICK_CHECK_NEW
			 where CONTAINER_ID = '${fromdata.CONTAINER_ID}'
			 )
				  and not exists (
			 select * from  TSDC_PICK_CHECK_CONFIRM_ORDER b
			 where a.SHIPMENT_ID = b.SHIPMENT_ID
			 )
			 ) as c
    where  (a.SHIPMENT_ID = b.BILL_N8_BLH or a.SHIPMENT_ID = b.BILL_NO)
	and a.SELLER_NO = b.STORE_NO
	and   C.SHIPMENT_ID_STS = a.SHIPMENT_ID
	and c.SHIP_TO = b.STORE_NO 
				

            
       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null',
                        query: query,
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,
                        query: query,
                    };
                    res.json(dataout);
                }
            }
        });
    });
});

app.post('/Rescan_checkitem_Old', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    console.log('Rescan_checkitem_Old');
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `  
        update TSDC_PICK_CHECK
		set QTY_CHECK = 0
        where SHIPMENT_ID = '${fromdata.shipment_id}'

     `;



        return pool.request().query(query, function (err_query) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query,
                    query: query
                };
                res.json(dataout);
            } else {
                dataout = {
                    status: 'success',
                    query: query
                };
                res.json(dataout);
            }
            sql.close();
        });
    });
});



app.post('/Rescan_checkitem_Sorter_Old', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    console.log('Rescan_checkitem_Sorter_Old');
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `  
        update TSDC_PICK_CHECK
		set QTY_CHECK = 0
        ,CHECK_DATE = null
        where  CONTAINER_ID = '${fromdata.CONTAINER_ID}'

     `;



        return pool.request().query(query, function (err_query) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query,
                    query: query
                };
                res.json(dataout);
            } else {
                dataout = {
                    status: 'success',
                    query: query
                };
                res.json(dataout);
            }
            sql.close();
        });
    });
});



app.post('/checkstatusUpdateConfirmOrder', function (req, res) {
    var fromdata = req.body;
    console.log("checkstatusUpdateConfirmOrder:");
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query =
            `
            select * from TSDC_PICK_CHECK_CONFIRM_ORDER
            where SHIPMENT_ID in (
            select distinct SHIPMENT_ID from TSDC_PICK_CHECK_NEW
            where CONTAINER_ID = '${fromdata.CONTAINER_ID}'
            )
    `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;

                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data
                    };
                    res.json(dataout);
                }
            }
            sql.close();
        });
    });
});


app.post('/UpdateConfirmOrder', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    console.log('UpdateConfirmOrder');
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `  
        UPDATE  TSDC_PICK_CHECK_NEW
        SET 	CHECK_DATE = GETDATE()
        WHERE	
                 SHIPMENT_ID = '${fromdata.shipment_id}'
				 and SELLER_NO = '${fromdata.SELLER_NO}'
     
        `;

        query += `

        UPDATE TSDC_PROCESS_ORDER_DETAIL_ORDERPICK_PRINT
        SET TOTAL_QTY = t.QTY_CHECK
        FROM TSDC_PROCESS_ORDER_DETAIL_ORDERPICK_PRINT AS p
        INNER JOIN
            (
                SELECT SHIPMENT_ID,ITEM_ID, SUM(QTY_CHECK) as QTY_CHECK
                FROM TSDC_PICK_CHECK_NEW
                WHERE  SHIPMENT_ID in ('${fromdata.shipment_id}')
                and SELLER_NO = '${fromdata.SELLER_NO}'
                GROUP BY ITEM_ID , SHIPMENT_ID
            ) t
            ON t.SHIPMENT_ID = p.INTERFACE_LINK_ID
            and t.ITEM_ID = p.ITEM
`;


        return pool.request().query(query, function (err_query) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query,
                    query: query
                };
                res.json(dataout);
            } else {
                dataout = {
                    status: 'success',
                    query: query
                };
                res.json(dataout);
            }
            sql.close();
        });
    });
});


app.post('/Rescancheckitem_all', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    console.log('Rescancheckitem_all');
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `  
        UPDATE  TSDC_PICK_CHECK_NEW
        SET 	QTY_CHECK = 0
        WHERE	CONTAINER_ID = '${fromdata.CONTAINER_ID}'
        and ORDER_TYPE = 'SORTER'

     
        `;

        return pool.request().query(query, function (err_query) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query,
                    query: query
                };
                res.json(dataout);
            } else {
                dataout = {
                    status: 'success',
                    query: query
                };
                res.json(dataout);
            }
            sql.close();
        });
    });
});

app.post('/UpdateCheckdate', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    console.log('UpdateCheckdate');
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `  
        UPDATE  TSDC_PICK_CHECK_NEW
        SET 	CHECK_DATE = GETDATE()
        WHERE	
                 SHIPMENT_ID = '${fromdata.shipment_id}'
				 and SELLER_NO = '${fromdata.SELLER_NO}'
     
        `;



        return pool.request().query(query, function (err_query) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query,
                    query: query
                };
                res.json(dataout);
            } else {
                dataout = {
                    status: 'success',
                    query: query
                };
                res.json(dataout);
            }
            sql.close();
        });
    });
});


app.post('/ReprintTracking', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    console.log("ReprintTracking :");
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `

        select REF_INDEX
        ,QTY
        ,PO_NO
        ,SELLER_NO
        ,BOX_NO_ORDER
        ,BOX_SIZE
		,TABLE_CHECK
        from  TSDC_PICK_CHECK_BOX_CONTROL_NEW
        where REF_INDEX = '${fromdata.REF_INDEX}'
        and PO_NO = '${fromdata.PO_NO}'
        AND SELLER_NO = '${fromdata.SELLER_NO}'
            

            
       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    data: err_query,
                    query: query,
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null',
                        query: query,
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,
                        query: query,
                    };
                    res.json(dataout);
                }
            }
        });
    });
});

app.post('/UpdateCheckdateSorter', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    console.log('UpdateCheckdateSorter');
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `  
        UPDATE  TSDC_PICK_CHECK
        SET 	CHECK_DATE = GETDATE()
        WHERE	
        SHIPMENT_ID = '${fromdata.shipment_id}'
		and  CONTAINER_ID = '${fromdata.CONTAINER_ID}'
        and CHECK_DATE is null
     
        `;



        return pool.request().query(query, function (err_query) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query,
                    query: query
                };
                res.json(dataout);
            } else {
                dataout = {
                    status: 'success',
                    query: query
                };
                res.json(dataout);
            }
            sql.close();
        });
    });
});



app.get('/outstanding_online', function (req, res) {
    var fromdata = req.body;
    console.log("outstanding_online:");
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query =
            `
            select CONVERT(varchar,transaction_date,103)Date,SHIPMENT_ID,SELLER_NO,BRAND,sum(QTY_REQUESTED)- sum(QTY_CHECK)QTY
            from TSDC_PICK_CHECK_NEW
            where ORDER_TYPE = 'online'
            and CHECK_DATE is null
            and TRANSACTION_DATE >= '2021-11-23'
            group by transaction_date,SHIPMENT_ID,SELLER_NO,BRAND
            order by SHIPMENT_ID
    `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;

                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data
                    };
                    res.json(dataout);
                }
            }
            sql.close();
        });
    });
});


app.get('/outstanding_offline', function (req, res) {
    var fromdata = req.body;
    console.log("outstanding_offline:");
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query =
            `
            select CONVERT(varchar,transaction_date,103)Date,SHIPMENT_ID,SELLER_NO,BRAND,sum(QTY_REQUESTED)- sum(QTY_CHECK)QTY
            from TSDC_PICK_CHECK_NEW
            where ORDER_TYPE = 'offline'
            and CHECK_DATE is null
            and TRANSACTION_DATE >= '2021-11-23'
            group by transaction_date,SHIPMENT_ID,SELLER_NO,BRAND
            order by SHIPMENT_ID
    `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;

                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data
                    };
                    res.json(dataout);
                }
            }
            sql.close();
        });
    });
});



app.get('/outstanding_sorter', function (req, res) {
    var fromdata = req.body;
    console.log("outstanding_sorter:");
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query =
            `
            select CONVERT(varchar,transaction_date,103)Date,SHIPMENT_ID,CONTAINER_ID,BRAND,sum(QTY_REQUESTED)- sum(QTY_CHECK)QTY
            from TSDC_PICK_CHECK_NEW
            where ORDER_TYPE = 'sorter'
            and CHECK_DATE is null
            and TRANSACTION_DATE >= '2021-11-23'
            group by transaction_date,SHIPMENT_ID,SELLER_NO,BRAND,CONTAINER_ID
            order by SHIPMENT_ID
    `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;

                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data
                    };
                    res.json(dataout);
                }
            }
            sql.close();
        });
    });
});


app.get('/outstanding_CfOrder', function (req, res) {
    var fromdata = req.body;
    console.log("outstanding_CfOrder:");
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query =
            `
            select CONVERT(varchar,transaction_date,103)Date,SHIPMENT_ID,BRAND,sum(QTY_REQUESTED)- sum(QTY_CHECK)QTY
            from TSDC_PICK_CHECK_NEW
            where ORDER_TYPE = 'Cf_order'
            and CHECK_DATE is null
            and TRANSACTION_DATE >= '2021-11-23'
            group by transaction_date,SHIPMENT_ID,SELLER_NO,BRAND
            order by SHIPMENT_ID
    `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;

                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data
                    };
                    res.json(dataout);
                }
            }
            sql.close();
        });
    });
});



app.get('/percent_online', function (req, res) {
    var fromdata = req.body;
    console.log("percent_online:");
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query =
            `
            select case when  bill_check = 0 or bill_all = 0 then 0
             when CONVERT(int, round( bill_check/bill_all*100,0)) is null then 0
			else CONVERT(int, round( bill_check/bill_all*100,0))
    end P_online
            from
            (
            select count(SHIPMENT_ID+SELLER_NO) as bill_check  from TSDC_PICK_CHECK_NEW
            where TRANSACTION_DATE >= '2021-11-23'
            and ORDER_TYPE = 'online'
            and CHECK_DATE is not  null  
            )as _check,
            (
            select count(SHIPMENT_ID+SELLER_NO) as bill_all from TSDC_PICK_CHECK_NEW 
            where TRANSACTION_DATE >= '2021-11-23'
			and  TRANSACTION_DATE <= getdate()
            and ORDER_TYPE = 'online'
            )as _REQUESTED

    `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;

                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data
                    };
                    res.json(dataout);
                }
            }
            sql.close();
        });
    });
});

app.get('/percent_offline', function (req, res) {
    var fromdata = req.body;
    console.log("percent_offline:");
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query =
            `
            select case when  bill_check = 0 or bill_all = 0 then 0
             when CONVERT(int, round( bill_check/bill_all*100,0)) is null then 0
			else CONVERT(int, round( bill_check/bill_all*100,0))
    end P_offline
            from
            (
            select count(SHIPMENT_ID+SELLER_NO) as bill_check  from TSDC_PICK_CHECK_NEW
            where TRANSACTION_DATE >= '2021-11-23'
            and ORDER_TYPE = 'offline'
            and CHECK_DATE is not  null  
            )as _check,
            (
            select count(SHIPMENT_ID+SELLER_NO) as bill_all from TSDC_PICK_CHECK_NEW 
            where TRANSACTION_DATE >= '2021-11-23'
			and  TRANSACTION_DATE <= getdate()
            and ORDER_TYPE = 'offline'
            )as _REQUESTED
    `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;

                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data
                    };
                    res.json(dataout);
                }
            }
            sql.close();
        });
    });
});

app.get('/percent_sorter', function (req, res) {
    var fromdata = req.body;
    console.log("percent_sorter:");
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query =
            `
            select case  when  bill_check = 0 or bill_all = 0 then 0
            when CONVERT(int, round( bill_check/bill_all*100,0)) is null then 0
			else CONVERT(int, round( bill_check/bill_all*100,0))
    end P_sorter
            from
            (
            select count(SHIPMENT_ID+SELLER_NO) as bill_check  from TSDC_PICK_CHECK_NEW
            where TRANSACTION_DATE >= '2021-11-23'
            and ORDER_TYPE = 'sorter'
            and CHECK_DATE is not  null  
            )as _check,
            (
            select count(SHIPMENT_ID+SELLER_NO) as bill_all from TSDC_PICK_CHECK_NEW 
            where TRANSACTION_DATE >= '2021-11-23'
			and  TRANSACTION_DATE <= getdate()
            and ORDER_TYPE = 'sorter'
            )as _REQUESTED
    `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;

                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data
                    };
                    res.json(dataout);
                }
            }
            sql.close();
        });
    });
});

app.get('/percent_CForder', function (req, res) {
    var fromdata = req.body;
    console.log("percent_CForder:");
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query =
            `
            select case  when  bill_check = 0 or bill_all = 0 then 0
            when CONVERT(int, round( bill_check/bill_all*100,0)) is null then 0
			else CONVERT(int, round( bill_check/bill_all*100,0))
    end P_CF_ORDER
            from
            (
            select count(SHIPMENT_ID+SELLER_NO) as bill_check  from TSDC_PICK_CHECK_NEW
            where TRANSACTION_DATE >= '2021-11-23'
            and ORDER_TYPE = 'CF_ORDER'
            and CHECK_DATE is not  null  
            )as _check,
            (
            select count(SHIPMENT_ID+SELLER_NO) as bill_all from TSDC_PICK_CHECK_NEW 
            where TRANSACTION_DATE >= '2021-11-23'
			and  TRANSACTION_DATE <= getdate()
            and ORDER_TYPE = 'CF_ORDER'
            )as _REQUESTED
    `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;

                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data
                    };
                    res.json(dataout);
                }
            }
            sql.close();
        });
    });
});

app.get('/Order_disappear', function (req, res) {
    var fromdata = req.body;
    console.log("Order_disappear:");
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query =
            `
        select SHIPMENT_ID,SELLER_NO,BRAND,ORDER_TYPE,sum(QTY_REQUESTED)-sum(QTY_CHECK) QTY from TSDC_PICK_CHECK_NEW
        where shipment_id in ( select distinct shipment_id from TSDC_PICK_CHECK_NEW where  CHECK_DATE is not null
        and QTY_REQUESTED != QTY_CHECK)
        and CONVERT(date,CHECK_DATE) = CONVERT(date,getdate())
        group by SHIPMENT_ID,SELLER_NO,BRAND,ORDER_TYPE

    `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;

                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data
                    };
                    res.json(dataout);
                }
            }
            sql.close();
        });
    });
});


app.post('/Order_disappear_detail', function (req, res) {
    var fromdata = req.body;
    console.log("Order_disappear:");
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query =
            `
        select SHIPMENT_ID,SELLER_NO,ITEM_ID,QTY_REQUESTED,QTY_CHECK from TSDC_PICK_CHECK_NEW
        where SHIPMENT_ID = '${fromdata.SHIPMENT_ID}'
        and SELLER_NO = '${fromdata.SELLER_NO}'
        and QTY_REQUESTED != QTY_CHECK
        order by ITEM_ID
    `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;

                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data
                    };
                    res.json(dataout);
                }
            }
            sql.close();
        });
    });
});

app.post('/CheckTrack', function (req, res) {
    var fromdata = req.body;
    console.log("CheckTrack:");
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query =
            `
        select BOX_SIZE,REF_INDEX,a.PO_NO,SELLER_NO,QTY,BOX_NO_ORDER,TABLE_CHECK,CUST_NAME ,TCHANNEL
        from TSDC_PICK_CHECK_BOX_CONTROL_NEW a,
        (select  SHIPPING_NAME,PO_NO,SHIP_NO,TCHANNEL from TSDC_INTERFACE_ORDER_HEADER) as c
            where  a.PO_NO = c.PO_NO
            and a.SELLER_NO = c.SHIP_NO 
        and REF_INDEX = '${fromdata.REF_INDEX}'
        
    `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;

                if (recordset.recordset.length === 0) {
                    var query = `
                    select BOX_SIZE,REF_INDEX,PO_NO,SELLER_NO,QTY,BOX_NO_ORDER,TABLE_CHECK,CUST_NAME,'Offline' as TCHANNEL
                    from TSDC_PICK_CHECK_BOX_CONTROL_NEW 
                    where REF_INDEX = '${fromdata.REF_INDEX}'
                       `;
                    return pool.request().query(query, function (err_query, recordset) {
                        if (err_query) {
                            dataout = {
                                status: 'error',
                                data: err_query,
                                query: query,
                            };
                            res.json(dataout);
                        } else {
                            var data = recordset.recordset;
                            if (recordset.recordset.length === 0) {
                                dataout = {
                                    status: 'null',
                                    query: query,
                                };
                                res.json(dataout);
                            } else {
                                dataout = {
                                    status: 'success',
                                    data: data,
                                    query: query,
                                };
                                res.json(dataout);
                            }
                        }
                    });
                } else {
                    dataout = {
                        status: 'success',
                        data: data
                    };
                    res.json(dataout);
                }
            }
            sql.close();
        });
    });
});


app.post('/updateBoxTracking', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    console.log('updateBoxTracking');
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `  
        INSERT INTO LOG_EDITBOX_TRACKING
        VALUES ('${fromdata.REF_INDEX}'
                ,'${fromdata.BEFORE_BOX_SIZE}'
                ,'${fromdata.BOX_SIZE}'
                ,'${fromdata.USER_NAME}'
                ,GETDATE() 
                );

        UPDATE  TSDC_PICK_CHECK_BOX_CONTROL_NEW
        SET	BOX_SIZE = '${fromdata.BOX_SIZE}'	
        ,WEIGHT = ${fromdata.CARTON_BOX_WEIGHT}
        ,WIDTH = ${fromdata.CARTON_BOX_W}
        ,HIGH = ${fromdata.CARTON_BOX_H}
        ,DEEP = ${fromdata.CARTON_BOX_L}
        where   REF_INDEX =  '${fromdata.REF_INDEX}';

        UPDATE  TSDC_PICK_CHECK_BOX_CONTROL_DETAIL_NEW
        SET	BOX_SIZE = '${fromdata.BOX_SIZE}'	
        where   REF_INDEX =  '${fromdata.REF_INDEX}';

     `;
        return pool.request().query(query, function (err_query) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query,
                    query: query
                };
                res.json(dataout);
            } else {
                var query =
                    `
                    select BOX_SIZE,REF_INDEX,PO_NO,SELLER_NO,QTY,BOX_NO_ORDER,TABLE_CHECK,CUST_NAME
                    from TSDC_PICK_CHECK_BOX_CONTROL_NEW 
                    where REF_INDEX = '${fromdata.REF_INDEX}'
                     `;
                     return pool.request().query(query, function (err_query, recordset) {
                        if (err_query) {
                            dataout = {
                                status: 'error',
                                data: err_query,
                                query: query,
                            };
                            res.json(dataout);
                        } else {
                            var data = recordset.recordset;
                            if (recordset.recordset.length === 0) {
                                dataout = {
                                    status: 'null',
                                    query: query,
                                };
                                res.json(dataout);
                            } else {
                                dataout = {
                                    status: 'success',
                                    data: data,
                                    
                                };
                                res.json(dataout);
                            }
                        }
                    });
            }
            sql.close();
        });
    });
});

app.post('/CheckWork_Old', function (req, res) {
    var fromdata = req.body;
    console.log("CheckWork_Old:");
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query =
            `
    
                select  CONTAINER_ID , case
                            when len(CONTAINER_ID) = '20' then 'Normal'
                            when len(CONTAINER_ID) < '5' then 'Online'
                            when len(CONTAINER_ID) < '10' then 'Sorter'
                            when len(CONTAINER_ID) = '13' then 'MASS'
                            when len(CONTAINER_ID) <= '17' then 'Online'
                            end WORK_TYPE
                             from TSDC_PICK_CHECK
                            where CONTAINER_ID like '${fromdata.CONTAINER_ID}'
                               group by CONTAINER_ID
                           
    `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query,
                    query:query
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;

                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null'
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data
                    };
                    res.json(dataout);
                }
            }
            sql.close();
        });
    });
});

app.post('/loaddataToOut', function (req, res) {
    var fromdata = req.body;
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query =
            `
            SELECT
            [BATCH_CODE]
            ,[CHUTENO]
            ,[CARTON_NO]
            ,[BILL_NO]
            ,convert (varchar,BILL_DATE,103) as BILL_DATE
            ,[BRAND]
            ,[BRAND_NAME]
            ,[TRANSPORT_ID]
            ,[TRANSPORT_NAME]
            ,[STORE_NO] as SELLER_NO
            ,[STORE_NAME] as SHIPPING_NAME
            ,[STORE_ADDRESS]
            ,[BILL_N8_BLH]
            ,[CORNER_ID_BLH]
            ,[SITE_ID_BLH]
            ,[PRINT_STATUS]
            ,[PRINTER_SORTER_IP]
            ,CONTAINER_ID
            ,'' as TABLE_CHECK
            ,MESSAGE_1
            ,MESSAGE_2
            ,MESSAGE_3
  FROM [TSDC_PICK_PRINT_SHIP_DELIVERY]
  where BILL_N8_BLH = (select distinct SHIPMENT_ID from TSDC_PICK_CHECK
    where CONTAINER_ID = '${fromdata.CONTAINER_ID}'
    )
    order by NET_AMOUNT DESC



      
                `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query,
                    query: query
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;

                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null',
                        query: query
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data
                    };
                    res.json(dataout);
                }
            }
            sql.close();
        });
    });
});

app.post('/UPDATE_CARTON_PRINT', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    console.log('UPDATE_CARTON_PRINT' + fromdata.FACTORY_ID);
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `  

        UPDATE  TSDC_PICK_CHECK
        SET 	CHECK_DATE = GETDATE()
        WHERE	CONTAINER_ID = '${fromdata.CONTAINER_ID}';

        UPDATE  TSDC_PICK_PRINT_SHIP_DELIVERY
        SET     CARTON_NO = '${fromdata.BOX_NUM}',PRINT_STATUS = 'Y'
        where BILL_N8_BLH = '${fromdata.shipment_id}';
  
        UPDATE  TSDC_SORTER_PRINT_SHIP_DELIVERY 
        SET     CARTON_NO = '${fromdata.BOX_NUM}'
        where BILL_N8_BLH = '${fromdata.shipment_id}';
        `;

        query += `
        Select top 1 [BATCH_CODE] ,
        [CHUTENO] ,
        [CARTON_NO] ,
        [BILL_NO] ,
        [BILL_DATE] ,
        [BRAND] ,
        [BRAND_NAME] ,
        [TRANSPORT_ID] ,
        [TRANSPORT_NAME] ,
        [STORE_NO] ,
        [STORE_NAME] ,
        [STORE_ADDRESS] ,
        [BILL_N8_BLH] ,
        [CORNER_ID_BLH] ,
        [SITE_ID_BLH] ,
        'N' as PRINT_STATUS ,
        [PRINTER_SORTER_IP] ,
        [NET_AMOUNT]  ,
        NULL as PRINT_DATE,
        NULL as DELIVERY_STATUS,
        NUll as DELIVERY_DATE 
        into #tepmall
      From TSDC_PICK_PRINT_SHIP_DELIVERY d
      Where BATCH_CODE like 'R%'
      and not exists
   (select 1 
   from TSDC_SORTER_PRINT_SHIP_DELIVERY a ,
      TSDC_PICK_PRINT_SHIP_DELIVERY b 
   where a.BILL_NO = b.BILL_NO 
      and a.BATCH_CODE = b.BATCH_CODE
      and b.BATCH_CODE like 'R%'
   and a.bill_no = d.bill_no)
      and PRINT_STATUS = 'Y'
     -- and CONTAINER_ID = '${fromdata.CONTAINER_ID}'
      and BILL_N8_BLH = (select distinct shipment_ID from TSDC_PICK_CHECK
       where CONTAINER_ID = '${fromdata.CONTAINER_ID}')
`;

query += `
Insert into TSDC_SORTER_PRINT_SHIP_DELIVERY
select [BATCH_CODE] ,
        [CHUTENO] ,
        [CARTON_NO] ,
        [BILL_NO] ,
        [BILL_DATE] ,
        [BRAND] ,
        [BRAND_NAME] ,
        [TRANSPORT_ID] ,
        [TRANSPORT_NAME] ,
        [STORE_NO] ,
        [STORE_NAME] ,
        [STORE_ADDRESS] ,
        [BILL_N8_BLH] ,
        [CORNER_ID_BLH] ,
        [SITE_ID_BLH] ,
       PRINT_STATUS ,
        [PRINTER_SORTER_IP] ,
        [NET_AMOUNT]  ,
      PRINT_DATE,
      DELIVERY_STATUS,
      DELIVERY_DATE  ,
      NULL as CUSTOMER_RECEIVE_STATUS,
	  NULL as CUSTOMER_RECEIVE_DATETIME,
      NULL as CUSTOMER_RECEIVE_USER_ID ,
      NULL as CONFIRM_CARTON_NO,
      NULL as CONFIRM_DATE,
      NULL as ROUTE_NO,
      NULL as PCPERIOD_NO,
      NULL as DATETIME_PCPERIOD
      ,NULL as [DELIVERY_NO]
      ,NULL as[DRIVER_NAME]
      ,NULL as [DRIVER_CAR]
      ,NULL as [DRIVER_TRANSPORTATION]
      ,NULL as [DRIVER_SIGNATURE]
      ,NULL as [USER_CONFIRM_DELIVERY]
      ,NULL as [DRIVER_SIGNATURE_DATE]
      from  #tepmall
`;


query += `
Insert into TSDC_PICK_PRINT_SHIP_DELIVERY_LOG
select [BATCH_CODE] ,
       [CHUTENO] ,
       [CARTON_NO] ,
       [BILL_NO] ,
       [BILL_DATE] ,
       [BRAND] ,
       [BRAND_NAME] ,
       [TRANSPORT_ID] ,
       [TRANSPORT_NAME] ,
       [STORE_NO] ,
       [STORE_NAME] ,
       [STORE_ADDRESS] ,
       [BILL_N8_BLH] ,
       [CORNER_ID_BLH] ,
       [SITE_ID_BLH] ,
       'Y' as [PRINT_STATUS] ,
       [PRINTER_SORTER_IP] ,
       [NET_AMOUNT] ,GETDATE() 
	    From TSDC_PICK_PRINT_SHIP_DELIVERY
       Where BATCH_CODE like 'R%'
       and PRINT_STATUS = 'Y'
       and BILL_N8_BLH = (select distinct shipment_ID from TSDC_PICK_CHECK
        where CONTAINER_ID = '${fromdata.CONTAINER_ID}')
      --  and CONTAINER_ID = '${fromdata.CONTAINER_ID}'
`;

query += `
DROP TABLE #tepmall
`;


    
        return pool.request().query(query, function (err_query) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query,
                    query:query
                };
                res.json(dataout);
            } else {
                dataout = {
                    status: 'success',
                    query:query
                };
                res.json(dataout);
            }
            sql.close();
        });
    });
});


app.post('/DATA_BACKLOG_SORTER', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    console.log("DATA_BACKLOG_SORTER : " );
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `
        select *  into #temp_TSDC_PROCESS_ORDER_DETAIL 
        from [10.26.1.11].[TSDC_Conveyor].dbo.TSDC_PROCESS_ORDER_DETAIL
                      where INTERFACE_LINK_ID  = '${fromdata.shipment_ID}'
         
         select * from (
                select ITEM 
                , TOTAL_QTY 
                , sum(QTY_CHECK) as QTY_CHECK 
                , SHIPMENT_ID
                ,USER_DEF1
                ,USER_DEF5
                ,CONVERT(varchar,DATE_TIME_STAMP,103) as DATE_TIME_STAMP
                ,CASE
              WHEN sum(QTY_CHECK) <> TOTAL_QTY THEN '0'
              ELSE '2'
          END AS STATUS_CHECK
                ,CASE
              WHEN sum(QTY_CHECK) <> TOTAL_QTY THEN 'CHECK ไม่ครบ'
              ELSE 'CHECK ครบ'
          END AS STATUS_VIEW
                  FROM #temp_TSDC_PROCESS_ORDER_DETAIL a , TSDC_PICK_CHECK b
                  where SHIPMENT_ID  = (select distinct shipment_ID 
          from  TSDC_PICK_CHECK where  shipment_ID = '${fromdata.shipment_ID}' )
                 and ITEM = ITEM_ID
                  and INTERFACE_LINK_ID = SHIPMENT_ID
                  and INTERFACE_LINK_ID = '${fromdata.shipment_ID}'
                  and USER_DEF5 = BRAND
                --  and CONVERT(date,DATE_TIME_STAMP) like '${fromdata.ORDER_DATE}'
          
          group by SHIPMENT_ID , ITEM_ID  , TOTAL_QTY , ITEM  ,USER_DEF1 ,USER_DEF5,DATE_TIME_STAMP
          
               
                  union all
          
                      select 
                       ITEM  
                      ,TOTAL_QTY 
                      ,'0' as QTY_CHECK 
                      ,INTERFACE_LINK_ID 
                      ,USER_DEF1
                      ,USER_DEF5
                      ,CONVERT(varchar,DATE_TIME_STAMP,103) as DATE_TIME_STAMP
                      , '1' as STATUS_CHECK
                      , 'ยังไม่มีการออกใบงาน' as STATUS_VIEW
                      from #temp_TSDC_PROCESS_ORDER_DETAIL
                      where  ITEM in (
                      select distinct ITEM from  #temp_TSDC_PROCESS_ORDER_DETAIL
                      where  not EXISTS 
                      (select distinct ITEM_ID from TSDC_PICK_CHECK
                      where #temp_TSDC_PROCESS_ORDER_DETAIL.ITEM =  TSDC_PICK_CHECK.ITEM_ID
                      and shipment_ID = '${fromdata.shipment_ID}' )
                      )
                      --and CONVERT(date,DATE_TIME_STAMP) like '${fromdata.ORDER_DATE}'
                     
                      ) as a ,
                      (   select SUM(TOTAL_QTY) as SUM_TOTAL_QTY from  #temp_TSDC_PROCESS_ORDER_DETAIL)  as b ,
                        (   select SUM(QTY_CHECK) as SUM_QTY_CHECK from  TSDC_PICK_CHECK where SHIPMENT_ID  = '${fromdata.shipment_ID}') as c
                      order by STATUS_CHECK , ITEM
                      ;
        
                      drop table #temp_TSDC_PROCESS_ORDER_DETAIL
       


       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query,
                    query:query
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null',
                        query:query
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,
                        
                    };
                    res.json(dataout);
                }
            }
        });
    });
});

app.post('/VIEW_BACKLOG_SORTER', function (req, res) {
    var fromdata = req.body;
    var Datenow = DateNow();
    console.log("VIEW_BACKLOG_SORTER : " );
    //sql.close();
    new sql.ConnectionPool(db).connect().then(pool => {

        var query = `
      
            
             
              select ITEM_ID 
              , sum(QTY_PICK) as QTY_PICK 
              , sum(QTY_CHECK) as QTY_CHECK 
              ,CASE
                WHEN USER_CHECK is null THEN 'ยังไม่มีการตรวจนับ'
                ELSE USER_CHECK
            END AS STATUS_CHECK from TSDC_PICK_CHECK
              where SHIPMENT_ID  like '${fromdata.shipment_ID}'
              and ITEM_ID = '${fromdata.ITEM}'
              group by ITEM_ID , USER_CHECK


              union all 
              
              select ITEM 
	, sum(TOTAL_QTY) as QTY_PICK 
	, '0' as QTY_CHECK 
     ,'ยังไม่มีการตรวจนับ' as STATUS_CHECK
    
 from [10.26.1.11].[TSDC_Conveyor].dbo.TSDC_PROCESS_ORDER_DETAIL
          where INTERFACE_LINK_ID like '${fromdata.shipment_ID}'
          and ITEM in (
          select distinct ITEM from  [10.26.1.11].[TSDC_Conveyor].dbo.TSDC_PROCESS_ORDER_DETAIL
          where INTERFACE_LINK_ID  like '${fromdata.shipment_ID}' and not EXISTS 
          (select distinct ITEM_ID from TSDC_PICK_CHECK
          where TSDC_PROCESS_ORDER_DETAIL.ITEM =  TSDC_PICK_CHECK.ITEM_ID
		  and shipment_ID like '${fromdata.shipment_ID}' )
          )
          and ITEM = '${fromdata.ITEM}'
		  group by ITEM 
          

       `;
        return pool.request().query(query, function (err_query, recordset) {
            if (err_query) {
                dataout = {
                    status: 'error',
                    member: err_query,
                    query:query
                };
                res.json(dataout);
            } else {
                var data = recordset.recordset;
                if (recordset.recordset.length === 0) {
                    dataout = {
                        status: 'null',
                        query:query
                    };
                    res.json(dataout);
                } else {
                    dataout = {
                        status: 'success',
                        data: data,
                        
                    };
                    res.json(dataout);
                }
            }
        });
    });
});



module.exports = app;