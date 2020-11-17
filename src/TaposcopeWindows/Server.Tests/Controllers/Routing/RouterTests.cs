using FluentAssertions;
using Server.Config;
using Server.Controllers.Routing;
using System;
using System.Collections.Generic;
using System.Text;
using Xunit;

namespace Server.Tests.Controllers.Routing
{
    public class RouterTests
    {
        Router _router;

        BackendRoutes _routes = new BackendRoutes
        {
            Dashboard = "https://somehost/dashboard"
        };

        public RouterTests()
        {
            _router = new Router(_routes);
        }

        [Theory]
        [InlineData(true)]
        [InlineData(false)]
        public void Should_route_downloads_to_downloads_backend(bool isAuthenticated)
        {
            var result = _router.Route("/downloads/latest/somefile.xyz", isAuthenticated);
            result.ShouldChallenge.Should().BeFalse();
            result.BackendPath.Should().Be(_routes.Downloads + "/latest/somefile.xyz");
            result.RedirectTo.Should().BeNull();
        }

        [Theory]
        [InlineData("/", "/")]
        [InlineData("/some/path", "/")]
        [InlineData("/some/path/", "/")]
        [InlineData("/file.xyz", "/file.xyz")]
        [InlineData("/some/path/file.xyz", "/file.xyz")]
        public void Should_route_other_paths_to_dashboard(string path, string expected)
        {
            var result = _router.Route(path, false);
            result.ShouldChallenge.Should().BeFalse();
            result.BackendPath.Should().Be(_routes.Dashboard + expected);
            result.RedirectTo.Should().BeNull();
        }


        [Theory]
        [InlineData("/", "/")]
        [InlineData("/some/path", "/")]
        [InlineData("/some/path/", "/")]
        [InlineData("/file.xyz", "/file.xyz")]
        [InlineData("/some/path/file.xyz", "/file.xyz")]
        public void If_authenticated_user_requests_dashboard_should_forward_them_to_dashboard(string path, string expected)
        {
            var result = _router.Route("/dashboard" + path, true);
            result.ShouldChallenge.Should().BeFalse();
            result.BackendPath.Should().Be(_routes.Dashboard + expected);
            result.RedirectTo.Should().BeNull();
        }

        [Theory]
        [InlineData("/file.xyz", "/file.xyz")]
        [InlineData("/some/path/file.xyz", "/file.xyz")]
        public void If_unauthenticated_user_requests_dashboard_resources_should_route_to_dashboard(string path, string expected)
        {
            var result = _router.Route("/dashboard" + path, false);
            result.ShouldChallenge.Should().BeFalse();
            result.BackendPath.Should().Be(_routes.Dashboard + expected);
            result.RedirectTo.Should().BeNull();
        }


        [Theory]
        // Root
        [InlineData("/", "/")]

        // React routes
        [InlineData("/somepath", "/")]
        [InlineData("/somepath/", "/")]
        [InlineData("/some/deeper/path", "/")]

        // Files located at various react routes
        [InlineData("/somefile.ext", "/somefile.ext")]
        [InlineData("/folder/subfolder/somefile.ext", "/somefile.ext")]
        public void Should_accommodate_react_front_end_routing(string requestedPath, string expectedPath)
        {
            var result = _router.Route(requestedPath, false);
            result.BackendPath.Should().Be(_routes.Dashboard + expectedPath);
            result.ShouldChallenge.Should().BeFalse();
            result.RedirectTo.Should().BeNull();

        }

        [Theory]
        [InlineData("/somefile.ext?query=xyz", true)]
        [InlineData("/somefile.ext?query=xyz", false)]
        [InlineData("/?x", false)]
        [InlineData("/thing?x", false)]
        [InlineData("/thing?x", true)]
        [InlineData("/dashboard/?x", true)]
        [InlineData("/dashboard/folder/x?x", true)]
        public void Should_strip_url_query(string requestedPath, bool isLoggedIn)
        {
            var result = _router.Route(requestedPath, isLoggedIn);
            result.BackendPath.Should().NotBeNull();
            result.BackendPath.Should().NotMatchRegex("\\?[a-zA-Z0-9-=]*");
        }
    }
}
