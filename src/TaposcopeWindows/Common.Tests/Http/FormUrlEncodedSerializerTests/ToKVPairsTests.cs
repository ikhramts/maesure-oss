using Common.Http;
using FluentAssertions;
using Newtonsoft.Json;
using System.Linq;
using Xunit;

namespace Common.Tests.Http.FormUrlEncodedSerializerTests
{
    public class ToKVPairsTests
    {
        [Theory]
        [InlineData(123, "123")]
        [InlineData(0, "0")]
        [InlineData(-5, "-5")]
        public void SerializeInt(int value, string expected)
        {
            var obj = new ClassWithIntValue { Value = value };
            var result = FormUrlEncodedSerializer.ToKVPairs(obj);
            result.First().Value.Should().Be(expected);
        }

        [Theory]
        [InlineData("")]
        [InlineData(" ")]
        [InlineData("abcd")]
        [InlineData("j72&&),;--=*")]
        public void SerializeString(string value)
        {
            var obj = new ClassWithStringValue { Value = value };
            var result = FormUrlEncodedSerializer.ToKVPairs(obj);
            result.First().Value.Should().Be(value);
        }

        [Theory]
        [InlineData(true, "true")]
        [InlineData(false, "false")]
        public void SerializeBool(bool value, string expected)
        {
            var obj = new ClassWithBoolValue { Value = value };
            var result = FormUrlEncodedSerializer.ToKVPairs(obj);
            result.First().Value.Should().Be(expected);
        }

        [Theory]
        [InlineData(123, "123")]
        [InlineData(0, "0")]
        [InlineData(-5, "-5")]
        [InlineData(0.25, "0.25")]
        [InlineData(3.125, "3.125")]
        public void SerializeDecimal(decimal value, string expected)
        {
            var obj = new ClassWithDecimalValue { Value = value };
            var result = FormUrlEncodedSerializer.ToKVPairs(obj);
            result.First().Value.Should().Be(expected);
        }

        [Fact]
        public void Serialize_two_properties()
        {
            var obj = new ClassWithTwoProperties
            {
                Value1 = "abc",
                Value2 = "def"
            };

            var result = FormUrlEncodedSerializer.ToKVPairs(obj);

            var property1 = result.First(kv => kv.Key == "val1");
            property1.Value.Should().Be("abc");

            var property2 = result.First(kv => kv.Key == "val2");
            property2.Value.Should().Be("def");
        }

        [Fact]
        public void If_field_has_JsonProperty_with_name_should_use_it()
        {
            var obj = new ClassWithNameAttribute { Value = 123 };
            var result = FormUrlEncodedSerializer.ToKVPairs(obj);
            result.First().Key.Should().Be("some_name");
        }

        [Fact]
        public void If_field_has_JsonProperty_but_no_name_then_should_the_actual_property_name()
        {
            var obj = new ClassWithIntValue { Value = 123 };
            var result = FormUrlEncodedSerializer.ToKVPairs(obj);
            result.First().Key.Should().Be("Value");
        }

        [Fact]
        public void If_field_has_no_JsonProperty_then_should_the_actual_property_name()
        {
            var obj = new ClassWithAttributeButNoName { Value = 123 };
            var result = FormUrlEncodedSerializer.ToKVPairs(obj);
            result.First().Key.Should().Be("Value");
        }

        [Fact]
        private void Should_include_properties_from_base_class()
        {
            var obj = new InheritingClass { PropertyInBase = 234 };
            var result = FormUrlEncodedSerializer.ToKVPairs(obj);

            result.First().Key.Should().Be("PropertyInBase");
            result.First().Value.Should().Be("234");
        }

        // ================= Helpers ===================
        private class ClassWithIntValue
        {
            public int Value { get; set; }
        }

        private class ClassWithStringValue
        {
            public string Value { get; set; }
        }

        private class ClassWithBoolValue
        {
            public bool Value { get; set; }
        }
        private class ClassWithDecimalValue
        {
            public decimal Value { get; set; }
        }

        private class ClassWithTwoProperties
        {
            [JsonProperty("val1")]
            public string Value1 { get; set; }

            [JsonProperty("val2")]
            public string Value2 { get; set; }
        }

        private class ClassWithNameAttribute
        {
            [JsonProperty("some_name")]
            public int Value { get; set; }

        }

        private class ClassWithAttributeButNoName
        {
            [JsonProperty]
            public int Value { get; set; }
        }

        private abstract class Base
        {
            public int PropertyInBase { get; set; }
        }

        private class InheritingClass : Base
        {

        }

    }
}
