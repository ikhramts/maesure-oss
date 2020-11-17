using CsvHelper;
using Messages;
using Microsoft.AspNetCore.Mvc;
using Server.Db;
using Server.Services.TimeLog;
using Server.Services.UserEvents;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

namespace Server.Controllers
{
    [Route("api/time-log")]
    [ApiController]
    public class TimeLogController : AppControllerBase
    {
        public TimeLogController(
            MainDbContext db, 
            IUserEventsService userEventsService,
            ITimeLogService timeLogService)
            : base(db, userEventsService)
        {
            _timeLogService = timeLogService;
        }

        [HttpGet]
        public async Task<TimeLogsReplyMsg> Get([FromQuery] DateTime fromTime, [FromQuery] DateTime toTime)
        {
            var poll = await GetDefaultPollAsync();
            var entries = await _timeLogService.Get(Db, poll.Id, fromTime, toTime);
            return new TimeLogsReplyMsg
            {
                Entries = entries
            };
        }

        [HttpPost]
        public async Task<IActionResult> Post([FromBody] PollResponseAddRequest msg)
        {
            var poll = await GetDefaultPollAsync();
            await _timeLogService.Add(Db, poll.Id, new[] { msg });
            return NoContent();
        }

        [HttpPost("add")]
        public async Task<IActionResult> PostMany([FromBody] IList<PollResponseAddRequest> msg)
        {
            var poll = await GetDefaultPollAsync();
            await _timeLogService.Add(Db, poll.Id, msg);
            return NoContent();
        }

        [HttpPost("undo")]
        public async Task<TimeLogEntryMsg> Undo([FromBody] TimeLogEntryActionMsg msg)
        {
            var poll = await GetDefaultPollAsync();
            return await _timeLogService.Undo(Db, poll.Id, msg.TargetId);
        }

        [HttpPost("delete")]
        public async Task<IActionResult> Delete([FromBody] TimeLogDeleteRequest msg)
        {
            var poll = await GetDefaultPollAsync();
            await _timeLogService.Delete(Db, poll.Id, msg);
            return NoContent();
        }

        [HttpPost("update")]
        public async Task<IActionResult> Update([FromBody] TimeLogUpdateRequest req)
        {
            var poll = await GetDefaultPollAsync();
            await _timeLogService.Update(Db, poll.Id, req);
            return NoContent();
        }

        [HttpGet("csv")]
        public async Task<IActionResult> GetCsv([FromQuery] DateTime fromTime, [FromQuery] DateTime toTime)
        {
            var poll = await GetDefaultPollAsync();
            var entries = await _timeLogService.Get(Db, poll.Id, fromTime, toTime);

            var csvRecords = entries.Select(logEntry => new CsvRecord
            {
                FromTime = logEntry.FromTime,
                ToTime = logEntry.GetToTime(),
                Length = logEntry.TimeBlockLength,
                Activity = logEntry.EntryText
            });

            var memoryStream = new MemoryStream();
            using (var writer = new StreamWriter(memoryStream))
            {
                using (var csv = new CsvWriter(writer))
                {
                    csv.Configuration.HasHeaderRecord = true;
                    csv.WriteRecords(csvRecords);
                    writer.Flush();
                }
            }

            // User event tracking.
            await UserEventsService.RecordEvent(new UserEvent
            {
                Account = await GetCurrentAccountAsync(),
                Category = "daily_logs",
                Name = "download_csv"
            });

            var body = memoryStream.ToArray();
            return File(body, "text/csv", "history.csv");
        }

        // =========================== Private ================================
        private ITimeLogService _timeLogService;

        private class CsvRecord
        {
            public DateTime FromTime { get; set; }
            public DateTime ToTime { get; set; }
            public TimeSpan Length { get; set; }
            public string Activity { get; set; }
        }
    }
}
