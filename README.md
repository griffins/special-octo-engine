# special-octo-engine
Limit polls to URL based on the server response

Today I got this email, am psyched up, I open the email, and I find an attachment, open in a task, something to do with algorithms and the web. 

First thing I did was to open the URL in my browser. And it just prints Hello from SWD. Uh not enough, I decided to bring in the big guns, I fire up my terminal  and 
```
curl http://51.144.38.252:8080/api/hello -v

< HTTP/1.1 200 OK
< X-Powered-By: Express
< X-RateLimit-Limit: 6
< X-RateLimit-Remaining: 2
< Content-Type: text/html; charset=utf-8
< Content-Length: 15
< ETag: W/"f-ekUYAdoC418BLph5EzzenyHp+0A"
< Date: Wed, 31 Oct 2018 18:55:12 GMT
< Connection: keep-alive

```
I then knew it was an HTTP 1.1 server and a good thing to help me solve my quiz it has rate limit headers. Half of my problem were solved. I was thinking of using binary search to make my algorithm learn about the rate limits but now I don't have to.

I decide to implement it with nodejs, just cause the backend was an express server.

Problem: How do we keep track of request and know when to drop incoming requests. 

Easy:  use two variables to keep track of :
1. The maximum number of requests in a time window.
2. The number of requests we are remaining with.

Problem: Do we consider a slot is taken when we are queuing the request after its response has been received, each of this methods has pros and cons.

The idea I have is dropping all requests till the rate limiter has learned of the time frame for our sliding window and the limit for the window.

First, we only send one request to get the rate limiter config before we start now doing parallel requests. After obtaining the limit and remaining attempts we fire a burst of requests to make sure all the slots are taken.

We then first one request per second till we get a response instead of a 429. We record the time start when we fired the request as t. 
We fire another request and find the difference in remaining requests in out bucket and also the difference in the time when the request was received and our initial time t. 

We repeat this step a few times and get the average time for one slot. We then get the window time by multiplying with the window limit. 
And we can now start letting request through our rate limiter

Inform of an algorithm that can be represented as below.
```
let limit = 0
let time_frame =0 
let remaining = 0

let request = make request()
limit = request.reponse.window_limit
remaining = request.reponse.remaing

repeat until 6 times:
  // fill up all slots
  for each remaining slots:
    make request()
  let time  = now()
  let time for one slot = 0
  while(slot not available):
    request = attempt to make request
    if we succedded:
      time for one slot = response.time - time/(limit - reponse.remaining)
      break
end repeat
time_frame = sum of all slot times / repeat times

```
Now once we have this we have enough information for the rate limiter to work properly

Ofcourse this can be improved by taking into account things lik network latencies to increase the accuracy of time slot used to calculate the time frames for the rate limiter.

Also we have the problem of droping all requests before the rate limiter initializes, solving that would make for a better limiter.
