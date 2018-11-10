SELECT q.site, q.question, q.timestamp, q.hotness,
  (LEAST(COUNT(a.*), 10) * (q.up_votes - q.down_votes) / 5.0 + SUM(a.up_votes - a.down_votes)) /
  (GREATEST(DATE_PART('day', q.timestamp - qq.createddate) * 24 + 
                 DATE_PART('hour', q.timestamp - qq.createddate) + 1, 6) ^ 1.4) * 
  CASE q.site WHEN 'workplace' THEN 0.45 WHEN 'softwareengineering' THEN 0.45 WHEN 'stackoverflow' THEN 0.8 ELSE 1 END
                 AS calculated_hotness,
  q.hotness / (
  (LEAST(COUNT(a.*), 10) * (q.up_votes - q.down_votes) / 5.0 + SUM(a.up_votes - a.down_votes)) /
  (GREATEST(DATE_PART('day', q.timestamp - qq.createddate) * 24 + 
                 DATE_PART('hour', q.timestamp - qq.createddate) + 1, 6) ^ 1.4) * 
  CASE q.site WHEN 'workplace' THEN 0.45 WHEN 'softwareengineering' THEN 0.45 WHEN 'stackoverflow' THEN 0.8 ELSE 1 END)
                 AS calculated_traffic_factor,

                 q.views, s.visits AS traffic
  FROM snapshots AS q INNER JOIN questions AS qq
    ON q.site = qq.site AND q.question = qq.id
  INNER JOIN sites AS s ON q.site = s.name
  INNER JOIN snapshots_answers AS a
    ON q.site = a.site AND q.question = a.question AND q.timestamp = a.timestamp
  WHERE q.timestamp = '2018-11-08 23:45'
  GROUP BY q.site, q.question, q.timestamp, qq.createddate, s.visits
  ORDER BY q.hotness DESC