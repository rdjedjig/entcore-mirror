package org.entcore.directory;

import io.vertx.core.eventbus.EventBus;
import io.vertx.core.json.JsonObject;
import io.vertx.ext.unit.Async;
import io.vertx.ext.unit.TestContext;
import io.vertx.ext.unit.junit.VertxUnitRunner;
import org.entcore.directory.utils.EmailState;
import org.entcore.directory.utils.EmailStateUtils;
import org.junit.BeforeClass;
import org.junit.ClassRule;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.entcore.test.TestHelper;
import org.testcontainers.containers.Neo4jContainer;

@RunWith(VertxUnitRunner.class)
public class EmailStateTest {
    private static final TestHelper test = TestHelper.helper();
    private static String userId;

    @ClassRule
    public static Neo4jContainer<?> neo4jContainer = test.database().createNeo4jContainer();

    @BeforeClass
    public static void setUp(TestContext context) throws Exception {
        test.initSharedData();
        test.database().initNeo4j(context, neo4jContainer);

        final Async async = context.async();
        
        test.directory().createActiveUser("login", "password", "email@test.com")
        .onComplete(res -> {
            context.assertTrue(res.succeeded());
            userId = res.result();
            async.complete();
        });
    }

    @Test
    public void testEmailValidationScenario(TestContext context) {
        final Async async = context.async();
        final EventBus eb = test.vertx().eventBus();

        EmailState.getDetails(eb, userId)
        // 1) check email is not verified
        .compose( details -> {
            final JsonObject emailState = details.getJsonObject("emailState");
            context.assertEquals(details.getString("email"), "email@test.com");
            context.assertNotNull(details.getInteger("waitInSeconds"));
            context.assertNotNull(emailState);
            context.assertEquals(EmailStateUtils.getState(emailState), EmailStateUtils.UNCHECKED);

            // 2) try verifying it
            return EmailState.setPending(eb, userId, "checked-email@test.com");
        })
        // 3) check pending data
        .map( emailState -> {
            context.assertNotNull(emailState);
            context.assertEquals(EmailStateUtils.getState(emailState), EmailStateUtils.PENDING);
            context.assertNotNull(EmailStateUtils.getValid(emailState));
            context.assertEquals(EmailStateUtils.getPending(emailState), "checked-email@test.com");
            return EmailStateUtils.getKey(emailState);
        })
        // 4) try a wrong code once
        .compose( validCode -> {
            return EmailState.tryValidate(eb, userId, "DEADBEEF")
            .map( (JsonObject result) -> {
                context.assertNotEquals(result.getInteger("state"), EmailStateUtils.UNCHECKED);
                context.assertNotEquals(result.getInteger("state"), EmailStateUtils.VALID);
                return validCode;
            });
        })
        // 5) try the correct code
        .compose( validCode -> {
            return EmailState.tryValidate(eb, userId, validCode)
            .compose( (JsonObject result) -> {
                context.assertEquals(result.getInteger("state"), EmailStateUtils.VALID);
                return EmailState.getDetails(eb, userId);
            });
        })
        // 1) check email is verified
        .map( details -> {
            final JsonObject emailState = details.getJsonObject("emailState");
            context.assertEquals(details.getString("email"), "checked-email@test.com");
            context.assertEquals(EmailStateUtils.getState(emailState), EmailStateUtils.VALID);
            return true;
        })
        .onComplete( res -> {
            context.assertTrue( res.succeeded() );
            async.complete();
        });
    }
}
