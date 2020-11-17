using Org.BouncyCastle.Crypto.Parameters;
using Org.BouncyCastle.OpenSsl;
using Org.BouncyCastle.Security;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text;

namespace Server.Services.Paddle
{
    public class PaddleWebhookSignatureVerifier : IPaddleWebhookSignatureVerifier
    {
        public PaddleWebhookSignatureVerifier()
        {
            // Construct a verifier using Paddle's public key.
            var stringReader = new StringReader(PaddlePublicKey);
            var pemReader = new PemReader(stringReader);
            _keyParams = (RsaKeyParameters)pemReader.ReadObject();

            _rsaParams = new RSAParameters();
            _rsaParams.Modulus = _keyParams.Modulus.ToByteArray();
            _rsaParams.Exponent = _keyParams.Exponent.ToByteArray();

            var rsa = new RSACryptoServiceProvider();
            rsa.ImportParameters(_rsaParams);

            _verifier = new RSAPKCS1SignatureDeformatter(rsa);
            _verifier.SetHashAlgorithm("SHA1");
        }

        public bool Verify(IEnumerable<KeyValuePair<string, string>> message)
        {
            // Verify webhook request following this Paddle spec:
            // https://developer.paddle.com/webhook-reference/verifying-webhooks
            //
            // Object serialization was implemented by replicating PHP serialize()
            // behaviour from this code: 
            // https://github.com/steelbrain/php-serialize/blob/master/src/serialize.js

            // Sort the fields and strip the signature.
            var orderedFields = message.Where(kv => kv.Key != PaddleField.Signature).OrderBy(kv => kv.Key).ToList();

            // Serialize using PHP serialize() method.
            var serialized = PhpSerialize(orderedFields);
            var serializedBytes = Encoding.UTF8.GetBytes(serialized);

            // Get the signature.
            var signatureField = message.FirstOrDefault(kv => kv.Key == PaddleField.Signature);

            if (signatureField.Equals(default(KeyValuePair<string, string>)))
            {
                throw new Exception($"The request doesn't have field '{PaddleField.Signature}'");
            }

            var signatureBytes = Convert.FromBase64String(signatureField.Value);

            // Verify the signature.
            var signer = SignerUtilities.GetSigner("SHA-1withRSA");
            signer.Init(false, _keyParams);
            signer.BlockUpdate(serializedBytes, 0, serializedBytes.Length);
            return signer.VerifySignature(signatureBytes);
        }

        // ====================== Private =====================
        private const string PaddlePublicKey =  // This is not private - this is Paddle public key.
@"-----BEGIN PUBLIC KEY-----
MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAnGmrxcg48nC4VfDFyibt
AJJp9hG0eeOQPI4be/1N0/2mj88+pf/wJGjnI37gitgGVR+rFNtV2Du9e/Xo++ob
O+hJSzxxUJ5MLGW/22n+MCvk61qCMPOUK9oOMy0AWVpC3mFkFAewO1qStKQqqYAD
2r2QKHMWPKFNjSoLQtFuAb1c4vy3iykO2a/4KJ3ObGg942RtrV0LMIpQtt/ou/dC
VMUafA2xwKr7t46o0AMbigDzomXB0k75UnHnyJyeOLaGkYk7tiAcN8+9xpforc73
+Nubb8QZpw6F5eqX7K8DAFbl0uSOls7szu5/a4X6Y+8HOAND5ai7pTHEJjkTZWy4
WkMEkVZB6JU91wTZUpbkn5BAE9e5EGjE+0mjFeHtlmlyD4WL84Sm6nvFr2fMzyLF
o67DxVTc8NMEUHeiB78DLhLcC6acJMAi7H9rhDgXSrr25NH4me2NfXJVZc5JWbnT
kdrs6kjdFvzaefXUDGhbO59wOjlKp64YK3T8JsKSSpoCkJXylbbcx3Z10GMJTu3E
GP8sJzYvUSJMDmWwws2rpcrpYTcwWDYUJlaoNk3H8HD4C8lgICg8Nalqau/RztBi
mpP2X4wuxcIG5zPf8YBH25JSsb20ZNZFwpzTXCqWpmKtfil3AgQ7UxLwcsWq1OgD
j4frzBB/3ETABjhVbV+GK7UCAwEAAQ==
-----END PUBLIC KEY-----";

        private RSAPKCS1SignatureDeformatter _verifier;
        private RsaKeyParameters _keyParams;
        private RSAParameters _rsaParams;

        private string PhpSerialize(IEnumerable<KeyValuePair<string, string>> message)
        {
            var sb = new StringBuilder();

            sb.Append("a:" + message.Count() + ":{");

            foreach (var kv in message)
            {
                var key = kv.Key;
                var value = kv.Value;

                sb.Append($"s:{key.Length}:\"{key}\";");

                if (value == null)
                {
                    sb.Append("s:0:\"\";");
                }
                else
                {
                    sb.Append($"s:{value.Length}:\"{value}\";");
                }
            }

            sb.Append("}");
            return sb.ToString();
        }
    }
}
